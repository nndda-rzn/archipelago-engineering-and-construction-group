import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { SequenceHelper } from './utils/sequence.helper';
import { StockLedgerWriter } from './inventory/stock-ledger-writer';
import { ActualCostCalculator } from './project/actual-cost.calculator';

@Module({
  providers: [PrismaService, SequenceHelper, StockLedgerWriter, ActualCostCalculator],
  exports: [SequenceHelper, StockLedgerWriter, ActualCostCalculator],
})
export class SharedModule {}
