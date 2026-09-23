import { Injectable, Inject } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';

@Injectable()
export class SequenceHelper {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Ambil nomor urut berikutnya.
   *
   * Bila `tx` diberikan, upsert dijalankan DI DALAM transaksi pemanggil — sehingga seq + create
   * dokumen atomik (tidak ada gap nomor saat create gagal). Bila tidak, helper membuka
   * transaksinya sendiri (perilaku lama, tetap kompatibel untuk pemanggil yang tidak butuh atomik).
   */
  async next(code: string, prefix: string, tx?: Prisma.TransactionClient): Promise<string> {
    if (tx) return this.issue(tx, code, prefix);
    return this.prisma.$transaction((t) => this.issue(t, code, prefix));
  }

  private async issue(tx: Prisma.TransactionClient, code: string, prefix: string): Promise<string> {
    const s = await tx.numberSequence.upsert({
      where: { code },
      update: { nextNumber: { increment: 1 } },
      create: { code, prefix, nextNumber: 2 },
    });
    return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
  }
}
