import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { IntercompanyService } from '../../application/services/intercompany.service';
import { PeriodCloseService } from '../../application/services/period-close.service';
import { FinancialStatementService } from '../../application/services/financial-statement.service';
import { ConsolidationService } from '../../application/services/consolidation.service';
import {
  CompletePeriodStepDto, CreateIntercompanyDto, CreatePeriodCloseDto, FinancialStatementQueryDto, ListIntercompanyQueryDto,
} from '../dto/finance-closure.dto';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class FinanceClosureController {
  constructor(
    @Inject(IntercompanyService) private readonly intercompany: IntercompanyService,
    @Inject(PeriodCloseService) private readonly periodClose: PeriodCloseService,
    @Inject(FinancialStatementService) private readonly financialStatement: FinancialStatementService,
    @Inject(ConsolidationService) private readonly consolidation: ConsolidationService,
  ) {}

  @Get('intercompany')
  @Permissions(Permission.JournalView)
  listIntercompany(@Query() query: ListIntercompanyQueryDto) {
    return this.intercompany.listIntercompany(query);
  }

  @Post('intercompany')
  @Permissions(Permission.JournalCreate)
  createIntercompany(@Body() dto: CreateIntercompanyDto, @Req() request: { user?: { sub?: string } }) {
    return this.intercompany.createIntercompany(dto, request.user?.sub ?? 'system');
  }

  @Post('intercompany/:id/post')
  @Permissions(Permission.JournalPost)
  postIntercompany(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.intercompany.postIntercompany(id, request.user?.sub ?? 'system');
  }

  @Get('intercompany/reconciliation')
  @Permissions(Permission.JournalView)
  intercompanyReconciliation() {
    return this.intercompany.intercompanyReconciliation();
  }

  @Get('period-closes')
  @Permissions(Permission.JournalView)
  listPeriodCloses() {
    return this.periodClose.listPeriodCloses();
  }

  @Post('period-closes')
  @Permissions(Permission.JournalPost)
  startPeriodClose(@Body() dto: CreatePeriodCloseDto, @Req() request: { user?: { sub?: string } }) {
    return this.periodClose.startPeriodClose(dto, request.user?.sub ?? 'system');
  }

  @Post('period-closes/:id/step')
  @Permissions(Permission.JournalPost)
  completeStep(@Param('id') id: string, @Body() dto: CompletePeriodStepDto, @Req() request: { user?: { sub?: string } }) {
    return this.periodClose.completeStep(id, dto, request.user?.sub ?? 'system');
  }

  @Post('period-closes/:id/close')
  @Permissions(Permission.JournalPost)
  closePeriod(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.periodClose.closePeriod(id, request.user?.sub ?? 'system');
  }

  @Post('period-closes/:id/lock')
  @Permissions(Permission.JournalPost)
  lockPeriod(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.periodClose.lockPeriod(id, request.user?.sub ?? 'system');
  }

  @Get('gl/income-statement')
  @Permissions(Permission.JournalView)
  incomeStatement(@Query() query: FinancialStatementQueryDto) {
    return this.financialStatement.incomeStatement(query);
  }

  @Get('gl/balance-sheet')
  @Permissions(Permission.JournalView)
  balanceSheet(@Query() query: FinancialStatementQueryDto) {
    return this.financialStatement.balanceSheet(query);
  }

  @Get('gl/consolidation')
  @Permissions(Permission.JournalView)
  getConsolidation() {
    return this.consolidation.consolidation();
  }
}
