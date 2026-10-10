import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import {
  AcceptInvitationDto, AssignRoleDto, CreateUserDto, InviteUserDto, ListUserQueryDto,
  ResetPasswordDto, SetUserStatusDto, UpdateUserDto, UpdateUserSettingsDto,
} from '../dto/user.dto';
import { UserService } from '../../application/services/user.service';

type ReqUser = { user?: { sub?: string } };

@Controller('users')
@UseGuards(AuthGuard, PermissionsGuard)
export class UserController {
  constructor(@Inject(UserService) private readonly service: UserService) {}

  @Get()
  @Permissions(Permission.UserView)
  findAll(@Query() query: ListUserQueryDto) {
    return this.service.findAll(query);
  }

  // Rute statis harus lebih dulu dari `:id`.
  @Get('stats')
  @Permissions(Permission.UserView)
  stats() {
    return this.service.stats();
  }

  @Post('invite')
  @Permissions(Permission.UserCreate)
  invite(@Body() dto: InviteUserDto, @Req() request: ReqUser) {
    return this.service.invite(dto, request.user?.sub ?? 'system');
  }

  @Post('invite/accept')
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.service.acceptInvitation(dto);
  }

  @Get(':id')
  @Permissions(Permission.UserView)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions(Permission.UserCreate)
  create(@Body() dto: CreateUserDto, @Req() request: ReqUser) {
    return this.service.create(dto, request.user?.sub ?? 'system');
  }

  @Patch(':id')
  @Permissions(Permission.UserEdit)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() request: ReqUser) {
    return this.service.update(id, dto, request.user?.sub ?? 'system');
  }

  @Post(':id/status')
  @Permissions(Permission.UserBlock)
  setStatus(@Param('id') id: string, @Body() dto: SetUserStatusDto, @Req() request: ReqUser) {
    return this.service.setStatus(id, dto, request.user?.sub ?? 'system');
  }

  @Post(':id/block')
  @Permissions(Permission.UserBlock)
  block(@Param('id') id: string, @Req() request: ReqUser) {
    return this.service.setStatus(id, { status: 'BLOCKED' }, request.user?.sub ?? 'system');
  }

  @Post(':id/unblock')
  @Permissions(Permission.UserBlock)
  unblock(@Param('id') id: string, @Req() request: ReqUser) {
    return this.service.setStatus(id, { status: 'ACTIVE' }, request.user?.sub ?? 'system');
  }

  @Post(':id/roles')
  @Permissions(Permission.UserManageRole)
  assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto, @Req() request: ReqUser) {
    return this.service.assignRole(id, dto, request.user?.sub ?? 'system');
  }

  @Delete(':id/roles/:roleCode')
  @Permissions(Permission.UserManageRole)
  revokeRole(@Param('id') id: string, @Param('roleCode') roleCode: string, @Req() request: ReqUser) {
    return this.service.revokeRole(id, roleCode, request.user?.sub ?? 'system');
  }

  @Post(':id/reset-password')
  @Permissions(Permission.UserResetPassword)
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto, @Req() request: ReqUser) {
    return this.service.resetPassword(id, dto, request.user?.sub ?? 'system');
  }

  @Get(':id/sessions')
  @Permissions(Permission.UserView)
  sessions(@Param('id') id: string) {
    return this.service.listSessions(id);
  }

  @Delete(':id/sessions/:sessionId')
  @Permissions(Permission.UserBlock)
  revokeSession(@Param('id') id: string, @Param('sessionId') sessionId: string, @Req() request: ReqUser) {
    return this.service.revokeSession(id, sessionId, request.user?.sub ?? 'system');
  }

  @Post(':id/force-logout')
  @Permissions(Permission.UserBlock)
  forceLogout(@Param('id') id: string, @Req() request: ReqUser) {
    return this.service.forceLogout(id, request.user?.sub ?? 'system');
  }

  @Get(':id/activity')
  @Permissions(Permission.UserView)
  activity(@Param('id') id: string) {
    return this.service.activity(id);
  }

  @Get(':id/settings')
  @Permissions(Permission.UserView)
  getSettings(@Param('id') id: string) {
    return this.service.getSettings(id);
  }

  @Patch(':id/settings')
  @Permissions(Permission.UserEdit)
  updateSettings(@Param('id') id: string, @Body() dto: UpdateUserSettingsDto) {
    return this.service.updateSettings(id, dto);
  }
}
