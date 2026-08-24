import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { Permissions } from '@/auth/permissions.decorator';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { CreateUserDto, ListUserQueryDto } from './dto/user.dto';
import { UserService } from './user.service';

@Controller('users')
@UseGuards(AuthGuard, PermissionsGuard)
export class UserController {
  constructor(@Inject(UserService) private readonly service: UserService) {}

  @Get()
  @Permissions('User.VIEW')
  findAll(@Query() query: ListUserQueryDto) {
    return this.service.findAll(query);
  }

  @Post()
  @Permissions('User.CREATE')
  create(@Body() dto: CreateUserDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.create(dto, request.user?.sub ?? 'system');
  }

  @Post(':id/block')
  @Permissions('User.BLOCK')
  block(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.service.block(id, request.user?.sub ?? 'system');
  }
}
