import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { FinanceClosureService } from '../../application/services/finance-closure.service';
import {
  CompletePeriodStepDto, CreateIntercompanyDto, CreatePeriodCloseDto, FinancialStatementQueryDto, ListIntercompanyQueryDto,
} from '../dto/finance-closure.dto';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class FinanceClosureController {
  constructor(@Inject(FinanceClosureService) private readonly closure: FinanceClosureService) {}

  @Get('intercompany')
  @Permissions(Permission.JournalView)
  listIntercompany(@Query() query: ListIntercompanyQueryDto) {
    return this.closure.listIntercompany(query);
  }

  @Post('intercompany')
  @Permissions(Permission.JournalCreate)
  createIntercompany(@Body() dto: CreateIntercompanyDto, @Req() request: { user?: { sub?: string } }) {
    return this.closure.createIntercompany(dto, request.user?.sub ?? 'system');
  }

  @Post('intercompany/:id/post')
  @Permissions(Permission.JournalPost)
  postIntercompany(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.closure.postIntercompany(id, request.user?.sub ?? 'system');
  }

  @Get('intercompany/reconciliation')
  @Permissions(Permission.JournalView)
  intercompanyReconciliation() {
    return this.closure.intercompanyReconciliation();
  }

  @Get('period-closes')
  @Permissions(Permission.JournalView)
  listPeriodCloses() {
    return this.closure.listPeriodCloses();
  }

  @Post('period-closes')
  @Permissions(Permission.JournalPost)
  startPeriodClose(@Body() dto: CreatePeriodCloseDto, @Req() request: { user?: { sub?: string } }) {
    return this.closure.startPeriodClose(dto, request.user?.sub ?? 'system');
  }

  @Post('period-closes/:id/step')
  @Permissions(Permission.JournalPost)
  completeStep(@Param('id') id: string, @Body() dto: CompletePeriodStepDto, @Req() request: { user?: { sub?: string } }) {
    return this.closure.completeStep(id, dto, request.user?.sub ?? 'system');
  }

  @Post('period-closes/:id/close')
  @Permissions(Permission.JournalPost)
  closePeriod(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.closure.closePeriod(id, request.user?.sub ?? 'system');
  }

  @Post('period-closes/:id/lock')
  @Permissions(Permission.JournalPost)
  lockPeriod(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.closure.lockPeriod(id, request.user?.sub ?? 'system');
  }

  @Get('gl/income-statement')
  @Permissions(Permission.JournalView)
  incomeStatement(@Query() query: FinancialStatementQueryDto) {
    return this.closure.incomeStatement(query);
  }

  @Get('gl/balance-sheet')
  @Permissions(Permission.JournalView)
  balanceSheet(@Query() query: FinancialStatementQueryDto) {
    return this.closure.balanceSheet(query);
  }

  @Get('gl/consolidation')
  @Permissions(Permission.JournalView)
  consolidation() {
    return this.closure.consolidation();
  }
}
