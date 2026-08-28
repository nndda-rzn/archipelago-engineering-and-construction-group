import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { CreateWbsItemDto } from '../dto/wbs.dto';
import { WbsService } from '../../application/services/wbs.service';

@Controller('projects/:projectId/wbs')
@UseGuards(AuthGuard, PermissionsGuard)
export class WbsController {
  constructor(@Inject(WbsService) private readonly service: WbsService) {}

  @Get()
  @Permissions(Permission.WbsView)
  getTree(@Param('projectId') projectId: string) {
    return this.service.getTree(projectId);
  }

  @Post()
  @Permissions(Permission.WbsCreate)
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateWbsItemDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.service.create(projectId, dto, request.user?.sub ?? 'system');
  }
}
