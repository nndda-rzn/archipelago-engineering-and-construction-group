import { Global, Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { SequenceHelper } from './utils/sequence.helper';
import { StockLedgerWriter } from './inventory/stock-ledger-writer';
import { ActualCostCalculator } from './project/actual-cost.calculator';

/**
 * Infrastruktur bersama. `@Global()` supaya `PrismaService` (dan helper bersama)
 * tersedia di seluruh domain TANPA tiap modul mendeklarasikannya ulang.
 *
 * Sebelumnya `PrismaService` di-`provide` di ~16 modul, sehingga NestJS membuat
 * satu PrismaClient per modul (≈16 pool × 10 koneksi). Satu-satunya tempat
 * `PrismaService` boleh didaftarkan adalah di sini.
 */
@Global()
@Module({
  providers: [PrismaService, SequenceHelper, StockLedgerWriter, ActualCostCalculator],
  exports: [PrismaService, SequenceHelper, StockLedgerWriter, ActualCostCalculator],
})
export class SharedModule {}
