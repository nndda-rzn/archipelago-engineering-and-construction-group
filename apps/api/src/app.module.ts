import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { HealthController } from './health/health.controller';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AuthModule } from './auth/auth.module';
import { FoundationModule } from './foundation/foundation.module';
import { AuditModule } from './audit/audit.module';
import { ProjectModule } from './project/project.module';
import { ProcurementModule } from './procurement/procurement.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [AuthModule, FoundationModule, AuditModule, ProjectModule, ProcurementModule, InventoryModule],
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
