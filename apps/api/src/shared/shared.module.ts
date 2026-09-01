import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { SequenceHelper } from './utils/sequence.helper';
import { StockLedgerWriter } from './inventory/stock-ledger-writer';
import { ActualCostCalculator } from './project/actual-cost.calculator';

/**
 * SharedModule — export semua shared utilities agar bisa di-inject
 * oleh domain modules yang memerlukannya.
 *
 * Cara pakai di domain module:
 *   imports: [SharedModule]
 *   // lalu inject SequenceHelper / StockLedgerWriter / ActualCostCalculator di constructor service
 */
@Module({
  providers: [PrismaService, SequenceHelper, StockLedgerWriter, ActualCostCalculator],
  exports: [SequenceHelper, StockLedgerWriter, ActualCostCalculator],
})
export class SharedModule {}
