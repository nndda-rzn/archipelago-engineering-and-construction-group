import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { GlHelper } from './shared/gl.helper';
import { assertPeriodOpen } from '@/shared/utils/period';
import type { CreateJournalDto, ListJournalQueryDto } from '../../presentation/dto/finance.dto';

@Injectable()
export class JournalService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(GlHelper) private readonly gl: GlHelper,
  ) {}

  async createJournal(dto: CreateJournalDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'LEGAL_ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    let totalDebit = 0;
    let totalCredit = 0;
    const lines: Array<{ accountId: string; description: string | null; debit: number; credit: number; projectId: string | null; wbsItemId: string | null }> = [];

    for (const line of dto.lines) {
      const account = await this.prisma.chartOfAccount.findUnique({ where: { id: line.accountId } });
      if (!account) throw new NotFoundException({ code: 'ACCOUNT_NOT_FOUND', message: `Akun ${line.accountId} tidak ditemukan` });
      if (!account.isActive) throw new ConflictException({ code: 'ACCOUNT_INACTIVE', message: `Akun ${account.code} tidak aktif` });
      if (account.legalEntityId !== dto.legalEntityId) {
        throw new ConflictException({ code: 'ACCOUNT_ENTITY_MISMATCH', message: `Akun ${account.code} beda legal entity` });
      }
      const debit = Number(line.debit);
      const credit = Number(line.credit);
      if (debit > 0 && credit > 0) {
        throw new ConflictException({ code: 'LINE_BOTH_SIDES', message: 'Satu line tidak boleh debit dan credit sekaligus' });
      }
      if (debit === 0 && credit === 0) {
        throw new ConflictException({ code: 'LINE_ZERO', message: 'Line harus punya debit atau credit' });
      }
      totalDebit += debit;
      totalCredit += credit;
      lines.push({
        accountId: account.id,
        description: line.description ?? null,
        debit,
        credit,
        projectId: line.projectId ?? null,
        wbsItemId: line.wbsItemId ?? null,
      });
    }

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new ConflictException({ code: 'UNBALANCED_JOURNAL', message: `Journal tidak balance: debit ${totalDebit} vs credit ${totalCredit}` });
    }

    const journalDate = dto.date ? new Date(dto.date) : new Date();

    const journal = await this.prisma.$transaction(async (tx) => {
      // Periode CLOSED/LOCKED tidak menerima jurnal baru (koreksi diarahkan ke periode terbuka).
      await assertPeriodOpen(tx, dto.legalEntityId, journalDate);
      const seq = await this.gl.generateJournalNumber(tx);
      return tx.journal.create({
        data: {
          journalNumber: seq,
          legalEntityId: dto.legalEntityId,
          date: journalDate,
          source: 'MANUAL',
          reference: dto.reference ?? null,
          description: dto.description,
          lines: { create: lines },
        },
        include: { lines: { include: { account: { select: { code: true, name: true } } } } },
      });
    });

    await this.audit.record({
      userId: actorId,
      action: 'Journal.CREATE',
      resource: 'Journal',
      resourceId: journal.id,
      newValue: { journalNumber: journal.journalNumber, totalDebit, totalCredit, description: dto.description },
      source: 'api',
    });

    return journal;
  }

  async postJournal(id: string, actorId: string) {
    const journal = await this.prisma.journal.findUnique({ where: { id }, include: { lines: true } });
    if (!journal) throw new NotFoundException({ code: 'JOURNAL_NOT_FOUND', message: 'Journal tidak ditemukan' });
    if (journal.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa diposting (${journal.status})` });
    }

    const totalDebit = journal.lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = journal.lines.reduce((sum, l) => sum + Number(l.credit), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new ConflictException({ code: 'UNBALANCED_JOURNAL', message: `Journal tidak balance: debit ${totalDebit} vs credit ${totalCredit}` });
    }

    // Posting jurnal manual memindahkan DRAFT → POSTED pada periode tanggal jurnal itu.
    // Guard periode + CAS dalam SATU transaksi: dua post paralel tidak bisa sama-sama menang,
    // dan periode yang dikunci di tengah jalan tidak bisa disisipi jurnal baru.
    const posted = await this.prisma.$transaction(async (tx) => {
      await assertPeriodOpen(tx, journal.legalEntityId, journal.date);
      const cas = await tx.journal.updateMany({
        where: { id, status: 'DRAFT' },
        data: { status: 'POSTED', postedAt: new Date(), postedBy: actorId },
      });
      if (cas.count === 0) {
        throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa diposting (${journal.status})` });
      }
      return tx.journal.findUniqueOrThrow({ where: { id } });
    });

    await this.audit.record({
      userId: actorId,
      action: 'Journal.POST',
      resource: 'Journal',
      resourceId: id,
      newValue: { journalNumber: journal.journalNumber, totalDebit, totalCredit },
      source: 'api',
    });

    return posted;
  }

  async listJournals(query: ListJournalQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.JournalWhereInput = {
      ...(query.legalEntityId ? { legalEntityId: query.legalEntityId } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.journal.findMany({
        where,
        include: { legalEntity: { select: { code: true } }, lines: { include: { account: { select: { code: true, name: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.journal.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}