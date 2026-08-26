import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { HealthController } from './health/health.controller';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { FoundationModule } from './modules/foundation';
import { ProjectModule } from './modules/project';
import { ProcurementModule } from './modules/procurement';
import { InventoryModule } from './modules/inventory';
import { ApprovalModule } from './modules/approval';
import { FinanceModule } from './modules/finance';
import { ConstructionModule } from './modules/construction';
import { HcmModule } from './modules/hcm';
import { HseModule } from './modules/hse';
import { QualityModule } from './modules/quality';
import { GovernanceModule } from './modules/governance';
import { AnalyticsModule } from './modules/analytics';
import { CommercialModule } from './modules/commercial';

@Module({
  imports: [FoundationModule, ProjectModule, ProcurementModule, InventoryModule, ApprovalModule, FinanceModule, ConstructionModule, HcmModule, HseModule, QualityModule, GovernanceModule, AnalyticsModule, CommercialModule],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
