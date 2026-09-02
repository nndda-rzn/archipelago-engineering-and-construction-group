import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateIntercompanyDto, ListIntercompanyQueryDto } from '../../presentation/dto/finance-closure.dto';

@Injectable()
export class IntercompanyService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  // FR-FIN-009: Intercompany transaction
  async createIntercompany(dto: CreateIntercompanyDto, actorId: string) {
    if (dto.fromEntityId === dto.toEntityId) {
      throw new ConflictException({ code: 'SAME_ENTITY', message: 'Entity asal dan tujuan harus berbeda' });
    }
    const from = await this.prisma.legalEntity.findUnique({ where: { id: dto.fromEntityId } });
    const to = await this.prisma.legalEntity.findUnique({ where: { id: dto.toEntityId } });
    if (!from) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Entity asal tidak ditemukan' });
    if (!to) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Entity tujuan tidak ditemukan' });

    const transactionNumber = await this.seq.next('IC', `IC-${new Date().getFullYear()}-`);

    const ic = await this.prisma.intercompanyTransaction.create({
      data: {
        transactionNumber,
        fromEntityId: dto.fromEntityId,
        toEntityId: dto.toEntityId,
        amount: dto.amount,
        currency: dto.currency ?? 'IDR',
        description: dto.description ?? null,
      },
    });

    await this.audit.record({ userId: actorId, action: 'Intercompany.CREATE', resource: 'IntercompanyTransaction', resourceId: ic.id, newValue: { transactionNumber, from: from.code, to: to.code, amount: Number(dto.amount) }, source: 'api' });
    return ic;
  }

  async postIntercompany(id: string, actorId: string) {
    const ic = await this.prisma.intercompanyTransaction.findUnique({ where: { id } });
    if (!ic) throw new NotFoundException({ code: 'IC_NOT_FOUND', message: 'Transaksi intercompany tidak ditemukan' });
    if (ic.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa diposting (${ic.status})` });
    }
    const posted = await this.prisma.intercompanyTransaction.update({
      where: { id },
      data: { status: 'POSTED', postedAt: new Date(), postedBy: actorId },
    });
    await this.audit.record({ userId: actorId, action: 'Intercompany.POST', resource: 'IntercompanyTransaction', resourceId: id, newValue: { transactionNumber: ic.transactionNumber, amount: Number(ic.amount) }, source: 'api' });
    return posted;
  }

  async listIntercompany(query: ListIntercompanyQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.IntercompanyTransactionWhereInput = query.status ? { status: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.intercompanyTransaction.findMany({
        where,
        include: { fromEntity: { select: { code: true } }, toEntity: { select: { code: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.intercompanyTransaction.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async intercompanyReconciliation() {
    const posted = await this.prisma.intercompanyTransaction.findMany({
      where: { status: 'POSTED' },
      include: { fromEntity: { select: { code: true } }, toEntity: { select: { code: true } } },
    });

    const byPair = new Map<string, { fromCode: string; toCode: string; totalFrom: number; totalTo: number; count: number }>();
    for (const ic of posted) {
      const key = `${ic.fromEntityId}|${ic.toEntityId}`;
      const pair = byPair.get(key) ?? { fromCode: ic.fromEntity.code, toCode: ic.toEntity.code, totalFrom: 0, totalTo: 0, count: 0 };
      pair.totalFrom += Number(ic.amount);
      pair.totalTo += Number(ic.amount);
      pair.count += 1;
      byPair.set(key, pair);
    }

    const items = [...byPair.values()].map((p) => ({
      fromCode: p.fromCode, toCode: p.toCode, count: p.count,
      amount: Math.round(p.totalFrom * 100) / 100,
      reciprocalAmount: Math.round(p.totalTo * 100) / 100,
      reconciled: true,
    }));

    const set = new Set(items.map((i) => `${i.fromCode}|${i.toCode}`));
    for (const i of items) { i.reconciled = set.has(`${i.toCode}|${i.fromCode}`); }

    const total = items.reduce((s, i) => s + i.amount, 0);
    return { items, total: Math.round(total * 100) / 100, generatedAt: new Date().toISOString() };
  }
}
