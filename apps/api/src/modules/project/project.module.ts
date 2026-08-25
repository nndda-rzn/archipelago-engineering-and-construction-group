import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ProjectController } from './presentation/controllers/project.controller';
import { WbsController } from './presentation/controllers/wbs.controller';
import { BudgetController } from './presentation/controllers/budget.controller';
import { ProjectService } from './application/services/project.service';
import { WbsService } from './application/services/wbs.service';
import { BudgetService } from './application/services/budget.service';
import { ProjectHealthService } from './application/services/project-health.service';
import { PortfolioService } from './application/services/portfolio.service';

@Module({
  imports: [],
  controllers: [ProjectController, WbsController, BudgetController],
  providers: [ProjectService, WbsService, BudgetService, ProjectHealthService, PortfolioService, PrismaService],
})
export class ProjectModule {}