import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { BudgetService } from '../../application/services/budget.service';
import { PublishBudgetDto, UpsertBudgetItemDto } from '../dto/budget.dto';

@Controller('projects/:projectId/budget')
@UseGuards(AuthGuard, PermissionsGuard)
export class BudgetController {
  constructor(@Inject(BudgetService) private readonly service: BudgetService) {}

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

  @Post('publish')
  @Permissions(Permission.BudgetApprove)
  publish(
    @Param('projectId') projectId: string,
    @Body() dto: PublishBudgetDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.service.publish(projectId, dto, request.user?.sub ?? 'system');
  }
}
