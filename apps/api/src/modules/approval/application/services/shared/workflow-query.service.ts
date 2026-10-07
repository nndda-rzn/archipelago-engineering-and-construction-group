import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { toConditionGroup, toNumber } from './condition-group-mapper';

/**
 * Baca-tulis definisi workflow yang dipakai bersama beberapa service approval:
 * daftar definisi dengan nama pembuat, dan definisi ACTIVE terbaru untuk sebuah
 * jenis transaksi. Sebelumnya query ini hidup di dalam dua service yang berbeda
 * (`approval-task`, `workflow-definition`) — dipusatkan agar bentuk response
 * konsisten dan konversi Decimal/JSON hanya ada di satu tempat.
 */
@Injectable()
export class WorkflowQueryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Definisi + nama pembuat + `updatedAt`. Prisma mengembalikan `conditionValue`
   * sebagai Decimal (string), jadi dikonversi eksplisit agar lolos kontrak
   * (`z.number()`).
   */
  async listWithMeta(where: Prisma.WorkflowDefinitionWhereInput = {}) {
    const definitions = await this.prisma.workflowDefinition.findMany({
      where,
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: [{ code: 'asc' }, { version: 'desc' }],
    });
    const creatorIds = [...new Set(definitions.map((d) => d.createdBy))];
    const users = creatorIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, displayName: true } })
      : [];
    const nameById = new Map(users.map((u) => [u.id, u.displayName]));

    return definitions.map((d) => ({
      ...d,
      createdByName: nameById.get(d.createdBy) ?? null,
      steps: d.steps.map((s) => ({
        ...s,
        conditionValue: toNumber(s.conditionValue),
        conditionGroup: toConditionGroup(s.conditionGroup),
      })),
    }));
  }

  /** Definisi ACTIVE terbaru untuk sebuah jenis transaksi (langkah urut `stepOrder`). */
  getActiveDefinition(transactionType: string) {
    return this.prisma.workflowDefinition.findFirst({
      where: { transactionType, status: 'ACTIVE' },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: { version: 'desc' },
    });
  }
}
