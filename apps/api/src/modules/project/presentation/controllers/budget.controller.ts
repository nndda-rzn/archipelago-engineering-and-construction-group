import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { BudgetService } from '../../application/services/budget.service';
import { BudgetBaselineService } from '../../application/services/budget-baseline.service';
import { PublishBudgetDto, UpsertBudgetItemDto } from '../dto/budget.dto';
import { FreezeBaselineDto, OpenRevisionDto } from '../dto/budget-baseline.dto';

@Controller('projects/:projectId/budget')
@UseGuards(AuthGuard, PermissionsGuard)
export class BudgetController {
  constructor(
    @Inject(BudgetService) private readonly service: BudgetService,
    @Inject(BudgetBaselineService) private readonly baseline: BudgetBaselineService,
  ) {}

  @Get()
  @Permissions(Permission.BudgetView)
  findAll(@Param('projectId') projectId: string) {
    return this.service.findAll(projectId);
  }

  @Post('items')
  @Permissions(Permission.BudgetCreate)
  upsert(
    @Param('projectId') projectId: string,
    @Body() dto: UpsertBudgetItemDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.service.upsert(projectId, dto, request.user?.sub ?? 'system');
  }

  /**
   * Dipertahankan sebagai alias freeze: klien web dan e2e lama memanggil rute
   * ini, dan semantiknya memang sama — membekukan budget berjalan.
   */
  @Post('publish')
  @Permissions(Permission.BudgetApprove)
  publish(
    @Param('projectId') projectId: string,
    @Body() dto: PublishBudgetDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.baseline.freeze(projectId, { reason: dto.note }, request.user?.sub ?? 'system');
  }

  @Get('baseline')
  @Permissions(Permission.BudgetView)
  findBaseline(@Param('projectId') projectId: string) {
    return this.baseline.findBaseline(projectId);
  }

  @Post('baseline/freeze')
  @Permissions(Permission.BudgetApprove)
  freeze(
    @Param('projectId') projectId: string,
    @Body() dto: FreezeBaselineDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.baseline.freeze(projectId, dto, request.user?.sub ?? 'system');
  }

  @Post('baseline/revision')
  @Permissions(Permission.BudgetApprove)
  openRevision(
    @Param('projectId') projectId: string,
    @Body() dto: OpenRevisionDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.baseline.openRevision(projectId, dto, request.user?.sub ?? 'system');
  }
}
