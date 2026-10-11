import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { CreateWbsItemDto, MoveWbsItemDto, UpdateWbsItemDto } from '../dto/wbs.dto';
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

  @Get(':itemId/links')
  @Permissions(Permission.WbsView)
  links(@Param('projectId') projectId: string, @Param('itemId') itemId: string) {
    return this.service.getLinks(projectId, itemId);
  }

  @Patch(':itemId')
  @Permissions(Permission.WbsEdit)
  update(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateWbsItemDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.service.update(projectId, itemId, dto, request.user?.sub ?? 'system');
  }

  @Delete(':itemId')
  @Permissions(Permission.WbsEdit)
  remove(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.service.remove(projectId, itemId, request.user?.sub ?? 'system');
  }

  @Post(':itemId/move')
  @Permissions(Permission.WbsEdit)
  move(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Body() dto: MoveWbsItemDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.service.move(projectId, itemId, dto, request.user?.sub ?? 'system');
  }
}
