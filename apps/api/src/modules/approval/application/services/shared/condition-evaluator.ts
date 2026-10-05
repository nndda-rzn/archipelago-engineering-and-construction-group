import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';

@Injectable()
export class ConditionEvaluator {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  evaluateCondition(step: { conditionField: string | null; conditionOp: string | null; conditionValue: Prisma.Decimal | null }, docValue: number | null): boolean {
    if (!step.conditionField || !step.conditionOp || step.conditionValue == null || docValue == null) return true;
    const threshold = Number(step.conditionValue);
    switch (step.conditionOp) {
      case '>': return docValue > threshold;
      case '<': return docValue < threshold;
      case '>=': return docValue >= threshold;
      case '<=': return docValue <= threshold;
      case '==': return docValue === threshold;
      default: return true;
    }
  }

  getDocValue(doc: Record<string, unknown>, field: string | null): number | null {
    if (!field) return null;
    const value = (doc as Record<string, unknown>)[field];
    if (value == null) return null;
    return Number(value);
  }

  async getTransaction(transactionType: string, transactionId: string) {
    switch (transactionType) {
      case 'PurchaseRequisition':
        return this.prisma.purchaseRequisition.findUnique({ where: { id: transactionId } });
      case 'PurchaseOrder':
        return this.prisma.purchaseOrder.findUnique({ where: { id: transactionId } });
      default:
        throw new BadRequestException({ code: 'UNSUPPORTED_TYPE', message: `Type ${transactionType} is not supported yet` });
    }
  }

  async updateTransactionStatus(tx: Prisma.TransactionClient, transactionType: string, transactionId: string, status: string) {
    switch (transactionType) {
      case 'PurchaseRequisition':
        return tx.purchaseRequisition.update({ where: { id: transactionId }, data: { status } });
      case 'PurchaseOrder':
        return tx.purchaseOrder.update({ where: { id: transactionId }, data: { status } });
      default:
        throw new BadRequestException({ code: 'UNSUPPORTED_TYPE', message: `Type ${transactionType} is not supported yet` });
    }
  }
}