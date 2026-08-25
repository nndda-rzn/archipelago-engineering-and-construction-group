import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { GlHelper } from './shared/gl.helper';
import type { CreateCollectionDto, ListCollectionQueryDto } from '../dto/finance.dto';

@Injectable()
export class CollectionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(GlHelper) private readonly gl: GlHelper,
  ) {}

  async createCollection(dto: CreateCollectionDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    let totalAmount = 0;
    const items: Array<{ clientInvoiceId: string; amount: number }> = [];
    for (const item of dto.items) {
      const invoice = await this.prisma.clientInvoice.findUnique({ where: { id: item.clientInvoiceId } });
      if (!invoice) throw new NotFoundException({ code: 'CLIENT_INVOICE_NOT_FOUND', message: 'Client invoice tidak ditemukan' });
      if (invoice.status !== 'POSTED') {
        throw new ConflictException({ code: 'INVOICE_NOT_POSTED', message: `Client invoice ${invoice.invoiceNumber} harus POSTED` });
      }
      if (invoice.projectId !== dto.projectId) {
        throw new ConflictException({ code: 'INVOICE_PROJECT_MISMATCH', message: 'Invoice bukan milik project ini' });
      }

      const collectedAgg = await this.prisma.collectionItem.aggregate({
        where: { clientInvoiceId: invoice.id, collection: { status: { not: 'CANCELLED' } } },
        _sum: { amount: true },
      });
      const open = Number(invoice.totalAmount) - Number(collectedAgg._sum.amount ?? 0);
      if (Number(item.amount) > open + 0.001) {
        throw new ConflictException({
          code: 'EXCEED_AR_OPEN',
          message: `Penerimaan melebihi saldo invoice ${invoice.invoiceNumber} (open ${open})`,
        });
      }
      totalAmount += Number(item.amount);
      items.push({ clientInvoiceId: invoice.id, amount: Number(item.amount) });
    }

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'COL' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'COL', prefix: `COL-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const collection = await this.prisma.collection.create({
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

    await this.audit.record({
      userId: actorId,
      action: 'Collection.CREATE',
      resource: 'Collection',
      resourceId: collection.id,
      newValue: { collectionNumber: seq, totalAmount: Number(totalAmount), client: dto.client },
      source: 'api',
    });

    return collection;
  }

  async postCollection(id: string, actorId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: { project: { select: { legalEntityId: true } } },
    });
    if (!collection) throw new NotFoundException({ code: 'COLLECTION_NOT_FOUND', message: 'Collection tidak ditemukan' });
    if (collection.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa diposting (${collection.status})` });
    }

    const posted = await this.prisma.collection.update({
      where: { id },
      data: { status: 'POSTED', collectedBy: actorId, collectedAt: new Date() },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Collection.POST',
      resource: 'Collection',
      resourceId: id,
      newValue: { collectionNumber: collection.collectionNumber, totalAmount: Number(collection.totalAmount) },
      source: 'api',
    });

    await this.gl.postCollectionJournal(
      { id: collection.id, collectionNumber: collection.collectionNumber, legalEntityId: collection.project.legalEntityId, totalAmount: Number(collection.totalAmount) },
      actorId,
    );

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