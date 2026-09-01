import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';

/**
 * SequenceHelper — terpusat untuk generate nomor urut dokumen.
 * Menggantikan 24+ blok inline `$transaction → numberSequence.upsert → format`
 * yang tersebar di seluruh codebase.
 *
 * Contoh pakai:
 *   const no = await this.seq.next('GR', `GR-${new Date().getFullYear()}-EPC-`);
 *   // → "GR-2026-EPC-000001"
 */
@Injectable()
export class SequenceHelper {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async next(code: string, prefix: string): Promise<string> {
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code },
        update: { nextNumber: { increment: 1 } },
        create: { code, prefix, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });
    return seq;
  }
}
