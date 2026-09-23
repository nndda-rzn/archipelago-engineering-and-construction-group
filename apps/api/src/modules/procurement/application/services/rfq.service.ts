import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateQuoteDto, CreateRfqDto, ListRfqQueryDto } from '../../presentation/dto/procurement.dto';

@Injectable()
export class RfqService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createRfq(dto: CreateRfqDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const rfq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'RFQ' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'RFQ', prefix: `RFQ-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      const seq = `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
      return tx.rfq.create({
        data: {
          rfqNumber: seq,
          projectId: dto.projectId,
          requisitionId: dto.requisitionId ?? null,
          title: dto.title,
          description: dto.description ?? null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          createdBy: actorId,
          items: {
            create: dto.items.map((i) => ({
              description: i.description,
              quantity: Number(i.quantity),
              unit: i.unit ?? 'EA',
              wbsItemId: i.wbsItemId ?? null,
            })),
          },
        },
        include: { items: true },
      });
    });

    await this.audit.record({
      userId: actorId,
      action: 'Rfq.CREATE',
      resource: 'Rfq',
      resourceId: rfq.id,
      newValue: { rfqNumber: rfq.rfqNumber, title: dto.title, projectId: dto.projectId },
      source: 'api',
    });

    return rfq;
  }

  async sendRfq(id: string, actorId: string) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id } });
    if (!rfq) throw new NotFoundException({ code: 'RFQ_NOT_FOUND', message: 'RFQ tidak ditemukan' });
    if (rfq.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa dikirim (${rfq.status})` });
    }

    const sent = await this.prisma.rfq.update({ where: { id }, data: { status: 'SENT' } });

    await this.audit.record({
      userId: actorId,
      action: 'Rfq.SEND',
      resource: 'Rfq',
      resourceId: id,
      newValue: { rfqNumber: rfq.rfqNumber },
      source: 'api',
    });

    return sent;
  }

  async createQuote(rfqId: string, dto: CreateQuoteDto, actorId: string) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id: rfqId }, include: { items: true } });
    if (!rfq) throw new NotFoundException({ code: 'RFQ_NOT_FOUND', message: 'RFQ tidak ditemukan' });
    if (rfq.status !== 'SENT' && rfq.status !== 'QUOTED') {
      throw new ConflictException({ code: 'RFQ_NOT_OPEN', message: 'RFQ harus SENT untuk menerima quote' });
    }

    const existing = await this.prisma.rfqQuote.findUnique({ where: { rfqId_vendor: { rfqId, vendor: dto.vendor } } });
    if (existing) throw new ConflictException({ code: 'QUOTE_EXISTS', message: `Vendor ${dto.vendor} sudah memberi quote` });

    const rfqItemMap = new Map(rfq.items.map((i) => [i.id, i]));
    let totalAmount = 0;
    const items = dto.items.map((item) => {
      const rfqItem = rfqItemMap.get(item.rfqItemId);
      if (!rfqItem) throw new NotFoundException({ code: 'RFQ_ITEM_NOT_FOUND', message: `Item RFQ ${item.rfqItemId} tidak ada` });
      const totalPrice = Number(rfqItem.quantity) * Number(item.unitPrice);
      totalAmount += totalPrice;
      return { rfqItemId: item.rfqItemId, unitPrice: Number(item.unitPrice), totalPrice };
    });

    const quote = await this.prisma.rfqQuote.create({
      data: { rfqId, vendor: dto.vendor, leadTimeDays: dto.leadTimeDays ?? null, remark: dto.remark ?? null, totalAmount, items: { create: items } },
      include: { items: true },
    });

    await this.prisma.rfq.update({ where: { id: rfqId }, data: { status: 'QUOTED' } });

    await this.audit.record({
      userId: actorId,
      action: 'Rfq.QUOTE',
      resource: 'Rfq',
      resourceId: rfqId,
      newValue: { quoteId: quote.id, vendor: dto.vendor, totalAmount: Number(totalAmount) },
      source: 'api',
    });

    return quote;
  }

  async evaluateRfq(id: string, actorId: string) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id }, include: { quotes: { include: { items: true } } } });
    if (!rfq) throw new NotFoundException({ code: 'RFQ_NOT_FOUND', message: 'RFQ tidak ditemukan' });
    if (rfq.status !== 'QUOTED' && rfq.status !== 'SENT') {
      throw new ConflictException({ code: 'NOT_QUOTED', message: 'RFQ belum punya quote' });
    }
    if (rfq.quotes.length === 0) {
      throw new ConflictException({ code: 'NO_QUOTES', message: 'Belum ada quote vendor' });
    }

    const technicalRejected = rfq.quotes.filter((q) => q.technicalStatus === 'REJECT');
    if (technicalRejected.length > 0) {
      throw new ConflictException({
        code: 'TECHNICAL_REJECTED',
        message: `Quote vendor ${technicalRejected.map((q) => q.vendor).join(', ')} ditolak teknis — evaluasi teknis dulu (FR-PRO-005)`,
      });
    }

    const ranked = rfq.quotes
      .filter((q) => q.status === 'SUBMITTED')
      .map((q) => {
        const leadPenalty = Number(q.leadTimeDays ?? 0) * 0.001;
        return { quote: q, normalizedScore: Number(q.totalAmount) * (1 + leadPenalty) };
      })
      .sort((a, b) => a.normalizedScore - b.normalizedScore);

    const evaluated = await this.prisma.$transaction(async (tx) => {
      const winner = ranked[0]!.quote;
      await tx.rfqQuote.updateMany({ where: { rfqId: id, id: { not: winner.id } }, data: { isWinner: false } });
      await tx.rfqQuote.update({ where: { id: winner.id }, data: { isWinner: true } });
      return tx.rfq.update({
        where: { id },
        data: { status: 'EVALUATED', awardedVendor: winner.vendor, awardedQuoteId: winner.id },
        include: { quotes: { include: { items: true } } },
      });
    });

    await this.audit.record({
      userId: actorId,
      action: 'Rfq.EVALUATE',
      resource: 'Rfq',
      resourceId: id,
      newValue: { rfqNumber: rfq.rfqNumber, winnerVendor: ranked[0]!.quote.vendor, normalizedScore: Number(ranked[0]!.normalizedScore.toFixed(2)) },
      source: 'api',
    });

    return evaluated;
  }

  async technicalReview(quoteId: string, technicalStatus: string, technicalNote: string | null, actorId: string) {
    const quote = await this.prisma.rfqQuote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new NotFoundException({ code: 'QUOTE_NOT_FOUND', message: 'Quote tidak ditemukan' });

    const updated = await this.prisma.rfqQuote.update({
      where: { id: quoteId },
      data: { technicalStatus, technicalNote: technicalNote ?? null },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Rfq.TECHNICAL_REVIEW',
      resource: 'RfqQuote',
      resourceId: quoteId,
      newValue: { vendor: quote.vendor, technicalStatus },
      source: 'api',
    });

    return updated;
  }

  async commercialEvaluation(rfqId: string) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id: rfqId }, include: { quotes: { include: { items: true } } } });
    if (!rfq) throw new NotFoundException({ code: 'RFQ_NOT_FOUND', message: 'RFQ tidak ditemukan' });

    const items = rfq.quotes
      .filter((q) => q.status === 'SUBMITTED')
      .map((q) => {
        const leadPenalty = Number(q.leadTimeDays ?? 0) * 0.001;
        const normalizedScore = Number(q.totalAmount) * (1 + leadPenalty);
        return {
          quoteId: q.id,
          vendor: q.vendor,
          totalAmount: Number(q.totalAmount),
          leadTimeDays: q.leadTimeDays ?? 0,
          normalizedScore: Math.round(normalizedScore * 100) / 100,
          technicalStatus: q.technicalStatus,
          isWinner: q.isWinner,
        };
      })
      .sort((a, b) => a.normalizedScore - b.normalizedScore);

    return {
      rfqId,
      rfqNumber: rfq.rfqNumber,
      items,
      recommended: items[0] ?? null,
      generatedAt: new Date().toISOString(),
    };
  }

  async listRfqs(query: ListRfqQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.RfqWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.rfq.findMany({
        where,
        include: { items: true, quotes: { include: { items: true } }, project: { select: { code: true, name: true } }, requisition: { select: { prNumber: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rfq.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}