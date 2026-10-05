import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared/shared.module';
import { ProjectController } from './presentation/controllers/project.controller';
import { WbsController } from './presentation/controllers/wbs.controller';
import { BudgetController } from './presentation/controllers/budget.controller';
import { ProjectControlsController } from './presentation/controllers/project-controls.controller';
import { ProjectService } from './application/services/project.service';
import { WbsService } from './application/services/wbs.service';
import { BudgetService } from './application/services/budget.service';
import { ProjectHealthService } from './application/services/project-health.service';
import { PortfolioService } from './application/services/portfolio.service';
import { PortfolioEvmService } from './application/services/portfolio-evm.service';
import { CostCodeService } from './application/services/cost-code.service';
import { ControlAccountService } from './application/services/control-account.service';
import { CommitmentService } from './application/services/commitment.service';
import { ForecastService } from './application/services/forecast.service';
import { EarnedValueService } from './application/services/earned-value.service';

@Module({
  imports: [SharedModule],
  controllers: [ProjectController, WbsController, BudgetController, ProjectControlsController],
  providers: [
    ProjectService,
    WbsService,
    BudgetService,
    ProjectHealthService,
    PortfolioService,
    PortfolioEvmService,
    CostCodeService,
    ControlAccountService,
    CommitmentService,
    ForecastService,
    EarnedValueService,
  ],
})
export class ProjectModule {}
