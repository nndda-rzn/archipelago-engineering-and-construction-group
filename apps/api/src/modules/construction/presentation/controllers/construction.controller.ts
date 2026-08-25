import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { CreateProgressDto, CreateWorkPackageDto, ListWorkPackageQueryDto } from '../dto/construction.dto';
import { WorkPackageService } from '../../application/services/work-package.service';

@Controller('projects/:projectId/work-packages')
@UseGuards(AuthGuard, PermissionsGuard)
export class ConstructionController {
  constructor(@Inject(WorkPackageService) private readonly service: WorkPackageService) {}

  @Get()
  @Permissions('WorkPackage.VIEW')
  findAll(@Param('projectId') projectId: string, @Query() query: ListWorkPackageQueryDto) {
    return this.service.findAll(projectId, query);
  }

  @Post()
  @Permissions('WorkPackage.CREATE')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateWorkPackageDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.service.create(projectId, dto, request.user?.sub ?? 'system');
  }

  @Post(':id/start')
  @Permissions('WorkPackage.EDIT')
  start(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.service.start(id, request.user?.sub ?? 'system');
  }

  @Post(':id/complete')
  @Permissions('WorkPackage.EDIT')
  complete(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.service.complete(id, request.user?.sub ?? 'system');
  }

  @Post(':id/progress')
  @Permissions('WorkPackage.EDIT')
  addProgress(
    @Param('id') id: string,
    @Body() dto: CreateProgressDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.service.addProgress(id, dto, request.user?.sub ?? 'system');
  }
}
