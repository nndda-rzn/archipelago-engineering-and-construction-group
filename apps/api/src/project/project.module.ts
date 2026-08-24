import { Module } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AuditModule } from '@/audit/audit.module';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { WbsController } from './wbs.controller';
import { WbsService } from './wbs.service';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';

@Module({
  imports: [AuditModule],
  controllers: [ProjectController, WbsController, BudgetController],
  providers: [ProjectService, WbsService, BudgetService, PrismaService],
})
export class ProjectModule {}
