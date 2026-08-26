import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { FinanceClosureService } from '../../application/services/finance-closure.service';
import {
  CompletePeriodStepDto, CreateIntercompanyDto, CreatePeriodCloseDto, FinancialStatementQueryDto, ListIntercompanyQueryDto,
} from '../dto/finance-closure.dto';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class FinanceClosureController {
  constructor(@Inject(FinanceClosureService) private readonly closure: FinanceClosureService) {}

  @Get('intercompany')
  @Permissions('Journal.VIEW')
  listIntercompany(@Query() query: ListIntercompanyQueryDto) {
    return this.closure.listIntercompany(query);
  }

  @Post('intercompany')
  @Permissions('Journal.CREATE')
  createIntercompany(@Body() dto: CreateIntercompanyDto, @Req() request: { user?: { sub?: string } }) {
    return this.closure.createIntercompany(dto, request.user?.sub ?? 'system');
  }

  @Post('intercompany/:id/post')
  @Permissions('Journal.POST')
  postIntercompany(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.closure.postIntercompany(id, request.user?.sub ?? 'system');
  }

  @Get('intercompany/reconciliation')
  @Permissions('Journal.VIEW')
  intercompanyReconciliation() {
    return this.closure.intercompanyReconciliation();
  }

  @Get('period-closes')
  @Permissions('Journal.VIEW')
  listPeriodCloses() {
    return this.closure.listPeriodCloses();
  }

  @Post('period-closes')
  @Permissions('Journal.POST')
  startPeriodClose(@Body() dto: CreatePeriodCloseDto, @Req() request: { user?: { sub?: string } }) {
    return this.closure.startPeriodClose(dto, request.user?.sub ?? 'system');
  }

  @Post('period-closes/:id/step')
  @Permissions('Journal.POST')
  completeStep(@Param('id') id: string, @Body() dto: CompletePeriodStepDto, @Req() request: { user?: { sub?: string } }) {
    return this.closure.completeStep(id, dto, request.user?.sub ?? 'system');
  }

  @Post('period-closes/:id/close')
  @Permissions('Journal.POST')
  closePeriod(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.closure.closePeriod(id, request.user?.sub ?? 'system');
  }

  @Post('period-closes/:id/lock')
  @Permissions('Journal.POST')
  lockPeriod(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.closure.lockPeriod(id, request.user?.sub ?? 'system');
  }

  @Get('gl/income-statement')
  @Permissions('Journal.VIEW')
  incomeStatement(@Query() query: FinancialStatementQueryDto) {
    return this.closure.incomeStatement(query);
  }

  @Get('gl/balance-sheet')
  @Permissions('Journal.VIEW')
  balanceSheet(@Query() query: FinancialStatementQueryDto) {
    return this.closure.balanceSheet(query);
  }

  @Get('gl/consolidation')
  @Permissions('Journal.VIEW')
  consolidation() {
    return this.closure.consolidation();
  }
}
