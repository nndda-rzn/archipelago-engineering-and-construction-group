import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { AssignPermissionsDto, CreateRoleDto } from './dto/role.dto';
import { RoleService } from './role.service';

@Controller('roles')
@UseGuards(AuthGuard, PermissionsGuard)
export class RoleController {
  constructor(@Inject(RoleService) private readonly service: RoleService) {}

  @Get()
  @Permissions('Role.VIEW')
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Permissions('Role.CREATE')
  create(@Body() dto: CreateRoleDto) {
    return this.service.create(dto);
  }

  @Post(':id/permissions')
  @Permissions('Role.EDIT')
  assignPermissions(@Param('id') id: string, @Body() dto: AssignPermissionsDto) {
    return this.service.assignPermissions(id, dto);
  }
}
