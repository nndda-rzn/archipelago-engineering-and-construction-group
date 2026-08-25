import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { Permissions } from '@/auth/permissions.decorator';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { CreateProjectDto, ListProjectQueryDto } from './dto/project.dto';
import { ProjectService } from './project.service';
import { ProjectHealthService } from './services/project-health.service';
import { PortfolioService } from './services/portfolio.service';

@Controller('projects')
@UseGuards(AuthGuard, PermissionsGuard)
export class ProjectController {
  constructor(
    @Inject(ProjectService) private readonly service: ProjectService,
    @Inject(ProjectHealthService) private readonly healthSvc: ProjectHealthService,
    @Inject(PortfolioService) private readonly portfolioSvc: PortfolioService,
  ) {}

  @Get()
  @Permissions('Project.VIEW')
  findAll(@Query() query: ListProjectQueryDto) {
    return this.service.findAll(query);
  }

  @Get('portfolio')
  @Permissions('Project.VIEW')
  portfolio() {
    return this.portfolioSvc.portfolio();
  }

  @Get(':id')
  @Permissions('Project.VIEW')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/health')
  @Permissions('Project.VIEW')
  health(@Param('id') id: string) {
    return this.healthSvc.health(id);
  }

  @Post()
  @Permissions('Project.CREATE')
  create(@Body() dto: CreateProjectDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.create(dto, request.user?.sub ?? 'system');
  }
}
