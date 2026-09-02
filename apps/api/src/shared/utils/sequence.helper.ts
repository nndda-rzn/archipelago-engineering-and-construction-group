import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';

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
