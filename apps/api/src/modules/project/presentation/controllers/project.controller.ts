import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { PortfolioFilterParams } from '@aec/api-contracts';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { CreateProjectDto, ListProjectQueryDto } from '../dto/project.dto';
import { ProjectService } from '../../application/services/project.service';
import { ProjectHealthService } from '../../application/services/project-health.service';
import { PortfolioService } from '../../application/services/portfolio.service';

@Controller('projects')
@UseGuards(AuthGuard, PermissionsGuard)
export class ProjectController {
  constructor(
    @Inject(ProjectService) private readonly service: ProjectService,
    @Inject(ProjectHealthService) private readonly healthSvc: ProjectHealthService,
    @Inject(PortfolioService) private readonly portfolioSvc: PortfolioService,
  ) {}

  @Get()
  @Permissions(Permission.ProjectView)
  findAll(@Query() query: ListProjectQueryDto) {
    return this.service.findAll(query);
  }

  @Get('portfolio')
  @Permissions(Permission.ProjectView)
  portfolio(@Query() query: PortfolioFilterParams) {
    return this.portfolioSvc.portfolio(query);
  }

  @Get(':id')
  @Permissions(Permission.ProjectView)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/health')
  @Permissions(Permission.ProjectView)
  health(@Param('id') id: string) {
    return this.healthSvc.health(id);
  }

  @Post()
  @Permissions(Permission.ProjectCreate)
  create(@Body() dto: CreateProjectDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.create(dto, request.user?.sub ?? 'system');
  }
}
