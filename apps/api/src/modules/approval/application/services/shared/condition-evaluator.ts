import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { evaluateCondition, evaluateConditionGroup, type ConditionGroupLike, type ConditionLike } from '@aec/api-contracts';

/** Bentuk langkah yang cukup untuk dievaluasi: kolom tunggal lama + grup opsional. */
export interface EvaluableStep extends ConditionLike {
  conditionGroup?: ConditionGroupLike | null;
}

@Injectable()
export class ConditionEvaluator {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Apakah langkah berlaku untuk sebuah nilai dokumen.
   *
   * Urutan: grup majemuk menang bila ada (ia yang paling ekspresif), jika tidak
   * jatuh ke kolom tunggal lama. Langkah tanpa syarat apa pun selalu berlaku —
   * perilaku yang sama dengan sebelumnya, jadi data lama tidak berubah makna.
   *
   * `resolveField` dipakai grup agar setiap aturan membaca field-nya sendiri.
   * Tanpa resolver, semua aturan dinilai terhadap `docValue` yang sama — benar
   * untuk kasus sekarang (satu field per jenis transaksi), tetapi rapuh bila
   * kelak ada field kedua, jadi resolver disediakan sejak awal.
   */
  evaluateCondition(
    step: EvaluableStep,
    docValue: number | null,
    resolveField?: (field: string) => number | null,
  ): boolean {
    if (step.conditionGroup) {
      const resolve = resolveField ?? (() => docValue);
      if (step.conditionGroup.conditions.length === 0) return true;
      const results = step.conditionGroup.conditions.map((c) => evaluateCondition(c, resolve(c.field)));
      return step.conditionGroup.combinator === 'OR' ? results.some(Boolean) : results.every(Boolean);
    }
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

  /** Ekspresi grup terhadap sebuah nilai tunggal (dipakai insight & simulasi). */
  evaluateGroup(group: ConditionGroupLike, docValue: number | null): boolean {
    return evaluateConditionGroup(group, docValue);
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