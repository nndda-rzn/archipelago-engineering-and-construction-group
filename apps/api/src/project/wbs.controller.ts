import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { Permissions } from '@/auth/permissions.decorator';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { CreateWbsItemDto } from './dto/wbs.dto';
import { WbsService } from './wbs.service';

@Controller('projects/:projectId/wbs')
@UseGuards(AuthGuard, PermissionsGuard)
export class WbsController {
  constructor(@Inject(WbsService) private readonly service: WbsService) {}

  @Get()
  @Permissions('WBS.VIEW')
  getTree(@Param('projectId') projectId: string) {
    return this.service.getTree(projectId);
  }

  @Post()
  @Permissions('WBS.CREATE')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateWbsItemDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.service.create(projectId, dto, request.user?.sub ?? 'system');
  }
}
