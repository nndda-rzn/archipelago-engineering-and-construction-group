import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { GlHelper } from './shared/gl.helper';
import { CacheService } from '@/shared/cache/cache.service';
import { invalidateAnalytics } from '@/shared/cache/analytics-cache';
import { withSerializableRetry } from '@/shared/database/serializable-tx';
import type { CreateCollectionDto, ListCollectionQueryDto } from '../../presentation/dto/finance.dto';

@Injectable()
export class CollectionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(GlHelper) private readonly gl: GlHelper,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  async createCollection(dto: CreateCollectionDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const invoiceIds = dto.items.map((i) => i.clientInvoiceId);
    const invoices = await this.prisma.clientInvoice.findMany({ where: { id: { in: invoiceIds } } });
    const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));

    const collectedGroups = await this.prisma.collectionItem.groupBy({
      by: ['clientInvoiceId'],
      where: { clientInvoiceId: { in: invoiceIds }, collection: { status: { not: 'CANCELLED' } } },
      _sum: { amount: true },
    });
    const collectedMap = new Map(collectedGroups.map((g) => [g.clientInvoiceId, Number(g._sum.amount ?? 0)]));

    let totalAmount = 0;
    const items: Array<{ clientInvoiceId: string; amount: number }> = [];
    for (const item of dto.items) {
      const invoice = invoiceMap.get(item.clientInvoiceId);
      if (!invoice) throw new NotFoundException({ code: 'CLIENT_INVOICE_NOT_FOUND', message: 'Client invoice not found' });
      if (invoice.status !== 'POSTED') {
        throw new ConflictException({ code: 'INVOICE_NOT_POSTED', message: `Client invoice ${invoice.invoiceNumber} must be POSTED` });
      }
      if (invoice.projectId !== dto.projectId) {
        throw new ConflictException({ code: 'INVOICE_PROJECT_MISMATCH', message: 'Invoice does not belong to this project' });
      }

      const open = Number(invoice.totalAmount) - (collectedMap.get(invoice.id) ?? 0);
      if (Number(item.amount) > open + 0.001) {
        throw new ConflictException({
          code: 'EXCEED_AR_OPEN',
          message: `Collection exceeds invoice outstanding balance ${invoice.invoiceNumber} (open ${open})`,
        });
      }
      totalAmount += Number(item.amount);
      items.push({ clientInvoiceId: invoice.id, amount: Number(item.amount) });
    }

    const collection = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'COL' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'COL', prefix: `COL-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      const seq = `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
      return tx.collection.create({
        data: {
          collectionNumber: seq,
          projectId: dto.projectId,
          client: dto.client,
          bankAccount: dto.bankAccount ?? null,
          reference: dto.reference ?? null,
          remark: dto.remark ?? null,
          totalAmount,
          items: { create: items },
        },
        include: { items: true },
      });
    });

    await this.audit.record({
      userId: actorId,
      action: 'Collection.CREATE',
      resource: 'Collection',
      resourceId: collection.id,
      newValue: { collectionNumber: collection.collectionNumber, totalAmount: Number(totalAmount), client: dto.client },
      source: 'api',
    });

    return collection;
  }

  async postCollection(id: string, actorId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: { project: { select: { legalEntityId: true } } },
    });
    if (!collection) throw new NotFoundException({ code: 'COLLECTION_NOT_FOUND', message: 'Collection not found' });
    if (collection.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Only DRAFT can be posted (${collection.status})` });
    }

    // Jurnal + CAS status dalam SATU transaksi: bila jurnal gagal, status tidak berubah;
    // bila status sudah bukan DRAFT (dua post paralel), jurnal ikut dibatalkan.
    const posted = await withSerializableRetry(
      this.prisma,
      async (tx) => {
        await this.gl.postCollectionJournal(
          tx,
          { id: collection.id, collectionNumber: collection.collectionNumber, legalEntityId: collection.project.legalEntityId, totalAmount: Number(collection.totalAmount) },
          actorId,
        );

        const cas = await tx.collection.updateMany({
          where: { id, status: 'DRAFT' },
          data: { status: 'POSTED', collectedBy: actorId, collectedAt: new Date() },
        });
        if (cas.count === 0) {
          throw new ConflictException({ code: 'NOT_DRAFT', message: `Only DRAFT can be posted (${collection.status})` });
        }

        return tx.collection.findUniqueOrThrow({ where: { id } });
      },
      { label: 'Collection.post' },
    );

    await this.audit.record({
      userId: actorId,
      action: 'Collection.POST',
      resource: 'Collection',
      resourceId: id,
      newValue: { collectionNumber: collection.collectionNumber, totalAmount: Number(collection.totalAmount) },
      source: 'api',
    });

    await invalidateAnalytics(this.cache);

    return posted;
  }

  async listCollections(query: ListCollectionQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.CollectionWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.collection.findMany({
        where,
        include: { items: { include: { clientInvoice: { select: { invoiceNumber: true, totalAmount: true } } } }, project: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.collection.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
