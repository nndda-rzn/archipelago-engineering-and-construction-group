import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { ProjectHealthService } from './services/project-health.service';
import { PortfolioService } from './services/portfolio.service';
import { WbsController } from './wbs.controller';
import { WbsService } from './wbs.service';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';

@Module({
  imports: [],
  controllers: [ProjectController, WbsController, BudgetController],
  providers: [ProjectService, ProjectHealthService, PortfolioService, WbsService, BudgetService, PrismaService],
})
export class ProjectModule {}
