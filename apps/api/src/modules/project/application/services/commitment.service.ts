import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';

@Injectable()
export class CommitmentService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // FR-PRJ-007: Commitment (PO/subcontract released)
  async commitment(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const [poAgg, subconAgg] = await Promise.all([
      this.prisma.purchaseOrder.aggregate({ where: { projectId, status: 'RELEASED' }, _sum: { totalAmount: true } }),
      this.prisma.subcontract.aggregate({ where: { projectId, status: 'ACTIVE' }, _sum: { contractValue: true } }),
    ]);

    const poCommitment = Number(poAgg._sum?.totalAmount ?? 0);
    const subcontractCommitment = Number(subconAgg._sum?.contractValue ?? 0);

    const budgetAgg = await this.prisma.budgetItem.aggregate({ where: { projectId, status: 'PUBLISHED' }, _sum: { amount: true } });
    const totalBudget = Number(budgetAgg._sum?.amount ?? 0);

    return {
      projectId,
      poCommitment,
      subcontractCommitment,
      totalCommitment: Math.round((poCommitment + subcontractCommitment) * 100) / 100,
      totalBudget,
      remainingBudget: Math.round((totalBudget - poCommitment - subcontractCommitment) * 100) / 100,
      generatedAt: new Date().toISOString(),
    };
  }
}
