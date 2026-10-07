import { Global, Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { SequenceHelper } from './utils/sequence.helper';
import { StockLedgerWriter } from './inventory/stock-ledger-writer';
import { ActualCostCalculator } from './project/actual-cost.calculator';
import { PortfolioEvmCalculator } from './project/portfolio-evm.calculator';
import { AnalyticsEventsService } from '@/shared/events/analytics-events.service';

/**
 * Infrastruktur bersama. `@Global()` supaya `PrismaService` (dan helper bersama)
 * tersedia di seluruh domain TANPA tiap modul mendeklarasikannya ulang.
 *
 * Sebelumnya `PrismaService` di-`provide` di ~16 modul, sehingga NestJS membuat
 * satu PrismaClient per modul (≈16 pool × 10 koneksi). Satu-satunya tempat
 * `PrismaService` boleh didaftarkan adalah di sini.
 *
 * `AnalyticsEventsService` juga global karena dipakai lintas domain: setiap
 * service mutasi mem-publish sinyal perubahan, dan modul analytics berlangganan.
 */
@Global()
@Module({
  providers: [
    PrismaService,
    SequenceHelper,
    StockLedgerWriter,
    ActualCostCalculator,
    PortfolioEvmCalculator,
    AnalyticsEventsService,
  ],
  exports: [
    PrismaService,
    SequenceHelper,
    StockLedgerWriter,
    ActualCostCalculator,
    PortfolioEvmCalculator,
    AnalyticsEventsService,
  ],
})
export class SharedModule {}
