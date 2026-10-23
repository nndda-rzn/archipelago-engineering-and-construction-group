import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { PortfolioFilterParams } from '@aec/api-contracts';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { AddProjectMemberDto, CreateProjectDto, ListProjectQueryDto, UpdateProjectDto, UpdateProjectMetaDto } from '../dto/project.dto';
import { ProjectService } from '../../application/services/project.service';
import { ProjectHealthService } from '../../application/services/project-health.service';
import { PortfolioService } from '../../application/services/portfolio.service';
import { PortfolioEvmService } from '../../application/services/portfolio-evm.service';

type ReqUser = { user?: { sub?: string } };

@Controller('projects')
@UseGuards(AuthGuard, PermissionsGuard)
export class ProjectController {
  constructor(
    @Inject(ProjectService) private readonly service: ProjectService,
    @Inject(ProjectHealthService) private readonly healthSvc: ProjectHealthService,
    @Inject(PortfolioService) private readonly portfolioSvc: PortfolioService,
    @Inject(PortfolioEvmService) private readonly portfolioEvmSvc: PortfolioEvmService,
  ) {}

  @Get()
  @Permissions(Permission.ProjectView)
  findAll(@Query() query: ListProjectQueryDto) {
    return this.service.findAll(query);
  }

  /**
   * Register: satu payload (metadata + biaya + health + tim) untuk daftar/kartu/
   * timeline. WAJIB didaftarkan SEBELUM `@Get(':id')` — jika tidak, "register"
   * akan ditangkap sebagai `:id` dan menghasilkan 404.
   */
  @Get('register')
  @Permissions(Permission.ProjectView)
  register(@Query() query: ListProjectQueryDto) {
    return this.service.register({ sort: query.sort, order: query.order });
  }

  @Get('stats')
  @Permissions(Permission.ProjectView)
  stats() {
    return this.service.stats();
  }

  @Get('portfolio')
  @Permissions(Permission.ProjectView)
  portfolio(@Query() query: PortfolioFilterParams) {
    return this.portfolioSvc.portfolio(query);
  }

  @Get('portfolio/evm')
  @Permissions(Permission.ProjectView)
  portfolioEvm(@Query() query: PortfolioFilterParams) {
    return this.portfolioEvmSvc.portfolioEvm(query);
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

  /**
   * Harus dideklarasikan SEBELUM `:id/...` agar "health" tidak dibaca sebagai id.
   */
  @Get('health/portfolio')
  @Permissions(Permission.ProjectView)
  healthPortfolio() {
    return this.healthSvc.portfolio();
  }

  @Get(':id/team')
  @Permissions(Permission.ProjectView)
  team(@Param('id') id: string) {
    return this.service.team(id);
  }

  @Get(':id/activity')
  @Permissions(Permission.ProjectView)
  activity(@Param('id') id: string) {
    return this.service.activity(id);
  }

  @Post()
  @Permissions(Permission.ProjectCreate)
  create(@Body() dto: CreateProjectDto, @Req() request: ReqUser) {
    return this.service.create(dto, request.user?.sub ?? 'system');
  }

  @Patch(':id')
  @Permissions(Permission.ProjectEdit)
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @Req() request: ReqUser) {
    return this.service.update(id, dto, request.user?.sub ?? 'system');
  }

  @Patch(':id/meta')
  @Permissions(Permission.ProjectEdit)
  updateMeta(@Param('id') id: string, @Body() dto: UpdateProjectMetaDto, @Req() request: ReqUser) {
    return this.service.updateMeta(id, dto, request.user?.sub ?? 'system');
  }

  @Post(':id/team')
  @Permissions(Permission.ProjectManageTeam)
  addMember(@Param('id') id: string, @Body() dto: AddProjectMemberDto, @Req() request: ReqUser) {
    return this.service.addMember(id, dto, request.user?.sub ?? 'system');
  }

  @Delete(':id/team/:assignmentId')
  @Permissions(Permission.ProjectManageTeam)
  removeMember(@Param('id') id: string, @Param('assignmentId') assignmentId: string, @Req() request: ReqUser) {
    return this.service.removeMember(id, assignmentId, request.user?.sub ?? 'system');
  }
}
