import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { AddRoleMemberDto, AssignPermissionsDto, CreateRoleDto, SetRoleStatusDto, UpdateRoleDto } from '../dto/role.dto';
import { RoleService } from '../../application/services/role.service';

type ReqUser = { user?: { sub?: string } };

@Controller('roles')
@UseGuards(AuthGuard, PermissionsGuard)
export class RoleController {
  constructor(@Inject(RoleService) private readonly service: RoleService) {}

  @Get()
  @Permissions(Permission.RoleView)
  findAll() {
    return this.service.findAll();
  }

  // Rute statis harus lebih dulu dari `:id`.
  @Get('stats')
  @Permissions(Permission.RoleView)
  stats() {
    return this.service.stats();
  }

  @Get('permissions/catalog')
  @Permissions(Permission.RoleView)
  listPermissions() {
    return this.service.listPermissions();
  }

  @Get(':id')
  @Permissions(Permission.RoleView)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions(Permission.RoleCreate)
  create(@Body() dto: CreateRoleDto, @Req() request: ReqUser) {
    return this.service.create(dto, request.user?.sub ?? 'system');
  }

  @Patch(':id')
  @Permissions(Permission.RoleEdit)
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto, @Req() request: ReqUser) {
    return this.service.update(id, dto, request.user?.sub ?? 'system');
  }

  @Post(':id/status')
  @Permissions(Permission.RoleEdit)
  setStatus(@Param('id') id: string, @Body() dto: SetRoleStatusDto, @Req() request: ReqUser) {
    return this.service.setStatus(id, dto.status, request.user?.sub ?? 'system');
  }

  @Delete(':id')
  @Permissions(Permission.RoleDelete)
  remove(@Param('id') id: string, @Req() request: ReqUser) {
    return this.service.remove(id, request.user?.sub ?? 'system');
  }

  @Put(':id/permissions')
  @Permissions(Permission.RoleEdit)
  assignPermissions(@Param('id') id: string, @Body() dto: AssignPermissionsDto, @Req() request: ReqUser) {
    return this.service.assignPermissions(id, dto, request.user?.sub ?? 'system');
  }

  @Post(':id/members')
  @Permissions(Permission.RoleEdit)
  addMember(@Param('id') id: string, @Body() dto: AddRoleMemberDto, @Req() request: ReqUser) {
    return this.service.addMember(id, dto, request.user?.sub ?? 'system');
  }

  @Delete(':id/members/:userId')
  @Permissions(Permission.RoleEdit)
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @Req() request: ReqUser) {
    return this.service.removeMember(id, userId, request.user?.sub ?? 'system');
  }
}
