import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ApprovalCounts, ApprovalQueueItem } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { RoleAssignmentLookup } from './shared/role-assignment.lookup';

export interface ListTasksParams {
  status?: string;
  type?: string;
  q?: string;
  mine?: boolean;
  page: number;
  pageSize: number;
}

/**
 * Read-model antrean approval: daftar task berfilter + hitungan per status, dan
 * pengayaan baris dengan konteks dokumen + hak putus aktor. Dipisah dari
 * `ApprovalTaskService` (penulisan) supaya jalur baca dan jalur tulis tidak lagi
 * berbagi kelas.
 */
@Injectable()
export class ApprovalQueueService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RoleAssignmentLookup) private readonly roles: RoleAssignmentLookup,
  ) {}

  async pendingCount(): Promise<number> {
    return this.prisma.approvalTask.count({ where: { status: 'PENDING' } });
  }

  /** Status yang dipakai untuk tab inbox. `ALL` = tanpa filter. */
  private statusWhere(status?: string): Prisma.ApprovalTaskWhereInput {
    return !status || status === 'ALL' ? {} : { status };
  }

  async listTasks(actorId: string, params: ListTasksParams) {
    const { status, type, q, mine, page, pageSize } = params;
    const skip = (page - 1) * pageSize;

    // "Mine" = hanya task yang benar-benar bisa diputuskan aktor: PENDING,
    // bukan pengaju sendiri (BR-003), dan role-nya dipegang aktor.
    const roleCodes = mine ? await this.roles.roleCodesOf(actorId) : [];
    const mineWhere: Prisma.ApprovalTaskWhereInput = mine
      ? { status: 'PENDING', requesterId: { not: actorId }, approverRoleCode: { in: roleCodes } }
      : {};

    const where: Prisma.ApprovalTaskWhereInput = {
      ...this.statusWhere(status),
      ...(type ? { transactionType: type } : {}),
      ...(q ? { transactionCode: { contains: q, mode: 'insensitive' } } : {}),
      ...mineWhere,
    };

    const [tasks, total, groups] = await Promise.all([
      this.prisma.approvalTask.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      this.prisma.approvalTask.count({ where }),
      // Counts mengabaikan filter status (agar label tab selalu lengkap) tetapi
      // menghormati filter lain supaya angkanya konsisten dengan isi antrean.
      this.prisma.approvalTask.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: { ...(type ? { transactionType: type } : {}), ...(q ? { transactionCode: { contains: q, mode: 'insensitive' } } : {}), ...mineWhere },
      }),
    ]);

    const counts = this.toCounts(groups);
    const items = await this.enrichQueue(tasks, actorId, roleCodes);

    return { items, total, counts };
  }

  private toCounts(groups: Array<{ status: string; _count: { _all: number } }>): ApprovalCounts {
    const byStatus = new Map(groups.map((g) => [g.status, g._count._all]));
    const pending = byStatus.get('PENDING') ?? 0;
    const approved = byStatus.get('APPROVED') ?? 0;
    const rejected = byStatus.get('REJECTED') ?? 0;
    return { PENDING: pending, APPROVED: approved, REJECTED: rejected, ALL: pending + approved + rejected };
  }

  /** Lengkapi baris antrean dengan konteks dokumen + hak putus aktor. */
  private async enrichQueue(
    tasks: Array<{ id: string; status: string; requesterId: string; approverRoleCode: string; transactionType: string; transactionId: string } & Record<string, unknown>>,
    actorId: string,
    knownRoleCodes: string[],
  ): Promise<ApprovalQueueItem[]> {
    if (tasks.length === 0) return [];
    const roleCodes = knownRoleCodes.length > 0 ? knownRoleCodes : await this.roles.roleCodesOf(actorId);

    const prIds = tasks.filter((t) => t.transactionType === 'PurchaseRequisition').map((t) => t.transactionId);
    const poIds = tasks.filter((t) => t.transactionType === 'PurchaseOrder').map((t) => t.transactionId);
    const requesterIds = [...new Set(tasks.map((t) => t.requesterId))];

    const [prs, pos, users] = await Promise.all([
      prIds.length
        ? this.prisma.purchaseRequisition.findMany({
            where: { id: { in: prIds } },
            include: { project: { select: { code: true, name: true } } },
          })
        : Promise.resolve([]),
      poIds.length
        ? this.prisma.purchaseOrder.findMany({
            where: { id: { in: poIds } },
            include: { project: { select: { code: true, name: true } } },
          })
        : Promise.resolve([]),
      requesterIds.length
        ? this.prisma.user.findMany({ where: { id: { in: requesterIds } }, select: { id: true, displayName: true } })
        : Promise.resolve([]),
    ]);

    const prById = new Map(prs.map((p) => [p.id, p]));
    const poById = new Map(pos.map((p) => [p.id, p]));
    const userById = new Map(users.map((u) => [u.id, u.displayName]));

    return tasks.map((task) => {
      const pr = task.transactionType === 'PurchaseRequisition' ? prById.get(task.transactionId) : undefined;
      const po = task.transactionType === 'PurchaseOrder' ? poById.get(task.transactionId) : undefined;
      const project = pr?.project ?? po?.project ?? null;
      const amount = pr?.estimatedTotal != null ? Number(pr.estimatedTotal) : po?.totalAmount != null ? Number(po.totalAmount) : null;
      const canApprove =
        task.status === 'PENDING' && task.requesterId !== actorId && roleCodes.includes(task.approverRoleCode);
      return {
        ...(task as unknown as ApprovalQueueItem),
        projectCode: project?.code ?? null,
        projectName: project?.name ?? null,
        amount,
        requesterName: userById.get(task.requesterId) ?? null,
        canApprove,
      };
    });
  }
}
