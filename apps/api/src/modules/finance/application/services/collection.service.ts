import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { GlHelper } from './shared/gl.helper';
import { CacheService } from '@/shared/cache/cache.service';
import { invalidateAnalytics } from '@/shared/cache/analytics-cache';
import { withSerializableRetry } from '@/shared/database/serializable-tx';
import { toCents, fromCents } from '@/shared/utils/money';
import type { CreateCollectionDto, ListCollectionQueryDto } from '../../presentation/dto/finance.dto';

/**
 * Status collection yang membuat alokasi AR MENGIKAT saldo client invoice (keputusan D1).
 * `DRAFT` sengaja tidak termasuk: draft adalah usulan, belum mengikat — termasuk `CANCELLED`
 * yang memang tidak boleh dihitung. Konsekuensinya penjaga saldo yang menentukan ada di
 * `postCollection`, bukan hanya di create.
 */
const COMMITTED_AR_STATUSES = ['POSTED'];

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
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const invoiceIds = dto.items.map((i) => i.clientInvoiceId);
    const invoices = await this.prisma.clientInvoice.findMany({ where: { id: { in: invoiceIds } } });
    const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));

    const collectedGroups = await this.prisma.collectionItem.groupBy({
      by: ['clientInvoiceId'],
      where: { clientInvoiceId: { in: invoiceIds }, collection: { status: { in: COMMITTED_AR_STATUSES } } },
      _sum: { amount: true },
    });
    const collectedMap = new Map(collectedGroups.map((g) => [g.clientInvoiceId, toCents(g._sum.amount)]));

    // Akumulasi per client invoice SEBELUM dibandingkan dengan saldo — lihat catatan pada
    // PaymentService.createPayment(). Satu baris hasil agregasi juga mencegah CollectionItem
    // ganda untuk invoice yang sama.
    const requestedMap = new Map<string, number>();
    for (const item of dto.items) {
      requestedMap.set(item.clientInvoiceId, (requestedMap.get(item.clientInvoiceId) ?? 0) + toCents(item.amount));
    }

    let totalCents = 0;
    const items: Array<{ clientInvoiceId: string; amount: number }> = [];
    for (const [invoiceId, requestedCents] of requestedMap) {
      const invoice = invoiceMap.get(invoiceId);
      if (!invoice) throw new NotFoundException({ code: 'CLIENT_INVOICE_NOT_FOUND', message: 'Client invoice tidak ditemukan' });
      if (invoice.status !== 'POSTED') {
        throw new ConflictException({ code: 'INVOICE_NOT_POSTED', message: `Client invoice ${invoice.invoiceNumber} harus POSTED` });
      }
      if (invoice.projectId !== dto.projectId) {
        throw new ConflictException({ code: 'INVOICE_PROJECT_MISMATCH', message: 'Invoice bukan milik project ini' });
      }

      // Pemeriksaan di sini bersifat lebih awal (early feedback). Penjaga yang MENGIKAT ada di
      // postCollection, karena pada tahap DRAFT alokasi belum dihitung sebagai komitmen.
      const openCents = toCents(invoice.totalAmount) - (collectedMap.get(invoice.id) ?? 0);
      if (requestedCents > openCents) {
        throw new ConflictException({
          code: 'EXCEED_AR_OPEN',
          message: `Penerimaan melebihi saldo invoice ${invoice.invoiceNumber} (open ${fromCents(openCents)})`,
        });
      }
      totalCents += requestedCents;
      items.push({ clientInvoiceId: invoice.id, amount: fromCents(requestedCents) });
    }
    const totalAmount = fromCents(totalCents);

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
      include: { items: true, project: { select: { legalEntityId: true } } },
    });
    if (!collection) throw new NotFoundException({ code: 'COLLECTION_NOT_FOUND', message: 'Collection tidak ditemukan' });
    if (collection.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa diposting (${collection.status})` });
    }

    const posted = await withSerializableRetry(
      this.prisma,
      async (tx) => {
        // Penjaga AR yang MENGIKAT (keputusan D1): DRAFT belum mengikat, sehingga pemeriksaan
        // saldo di create tidak cukup — dua collection DRAFT paralel untuk invoice yang sama
        // masing-masing lolos di sana. Baca saldo + tulis transisi dalam satu transaksi.
        const invoiceIds = collection.items.map((item) => item.clientInvoiceId);

        const invoices = await tx.clientInvoice.findMany({
          where: { id: { in: invoiceIds } },
          select: { id: true, invoiceNumber: true, totalAmount: true, status: true, projectId: true },
        });
        const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));

        const committedGroups = await tx.collectionItem.groupBy({
          by: ['clientInvoiceId'],
          where: {
            clientInvoiceId: { in: invoiceIds },
            collection: { status: { in: COMMITTED_AR_STATUSES } },
          },
          _sum: { amount: true },
        });
        const committedMap = new Map(committedGroups.map((g) => [g.clientInvoiceId, toCents(g._sum.amount)]));

        const requestedMap = new Map<string, number>();
        for (const item of collection.items) {
          requestedMap.set(item.clientInvoiceId, (requestedMap.get(item.clientInvoiceId) ?? 0) + toCents(item.amount));
        }

        for (const [invoiceId, requestedCents] of requestedMap) {
          const invoice = invoiceMap.get(invoiceId);
          if (!invoice) throw new NotFoundException({ code: 'CLIENT_INVOICE_NOT_FOUND', message: `Client invoice ${invoiceId} tidak ditemukan` });
          if (invoice.status !== 'POSTED') {
            throw new ConflictException({ code: 'INVOICE_NOT_POSTED', message: `Client invoice ${invoice.invoiceNumber} harus POSTED` });
          }
          if (invoice.projectId !== collection.projectId) {
            throw new ConflictException({ code: 'INVOICE_PROJECT_MISMATCH', message: 'Invoice bukan milik project ini' });
          }

          const openCents = toCents(invoice.totalAmount) - (committedMap.get(invoiceId) ?? 0);
          if (requestedCents > openCents) {
            throw new ConflictException({
              code: 'EXCEED_AR_OPEN',
              message: `Posting melebihi saldo invoice ${invoice.invoiceNumber} (open ${fromCents(openCents)})`,
            });
          }
        }

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
          throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa diposting (${collection.status})` });
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