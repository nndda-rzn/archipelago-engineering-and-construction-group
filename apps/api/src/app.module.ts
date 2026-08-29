import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
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
import { EngineeringModule } from './modules/engineering';
import { MasterDataModule } from './modules/master-data';
import { TreasuryModule } from './modules/treasury';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'debug',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
        autoLogging: true,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: Number(process.env.THROTTLE_TTL ?? 60) * 1000,
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
    ]),
    FoundationModule, ProjectModule, ProcurementModule, InventoryModule, ApprovalModule, FinanceModule, ConstructionModule, HcmModule, HseModule, QualityModule, GovernanceModule, AnalyticsModule, CommercialModule, EngineeringModule, MasterDataModule, TreasuryModule],
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
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
