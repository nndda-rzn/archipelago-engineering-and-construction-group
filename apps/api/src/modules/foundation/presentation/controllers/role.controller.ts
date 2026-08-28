import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { AssignPermissionsDto, CreateRoleDto } from '../dto/role.dto';
import { RoleService } from '../../application/services/role.service';

@Controller('roles')
@UseGuards(AuthGuard, PermissionsGuard)
export class RoleController {
  constructor(@Inject(RoleService) private readonly service: RoleService) {}

  @Get()
  @Permissions(Permission.RoleView)
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Permissions(Permission.RoleCreate)
  create(@Body() dto: CreateRoleDto) {
    return this.service.create(dto);
  }

  @Post(':id/permissions')
  @Permissions(Permission.RoleEdit)
  assignPermissions(@Param('id') id: string, @Body() dto: AssignPermissionsDto) {
    return this.service.assignPermissions(id, dto);
  }
}
