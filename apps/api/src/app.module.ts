import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { HealthController } from './health/health.controller';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { FoundationModule } from './modules/foundation';
import { ProjectModule } from './project/project.module';
import { ProcurementModule } from './procurement/procurement.module';
import { InventoryModule } from './inventory/inventory.module';
import { ApprovalModule } from './approval/approval.module';
import { FinanceModule } from './finance/finance.module';

@Module({
  imports: [FoundationModule, ProjectModule, ProcurementModule, InventoryModule, ApprovalModule, FinanceModule],
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
