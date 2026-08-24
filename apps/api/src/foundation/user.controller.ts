import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
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
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Post(':id/block')
  @Permissions('User.BLOCK')
  block(@Param('id') id: string) {
    return this.service.block(id);
  }
}
