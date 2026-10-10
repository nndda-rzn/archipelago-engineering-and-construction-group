import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { CreateLegalEntityDto } from '../dto/create-legal-entity.dto';
import { ListLegalEntityQueryDto } from '../dto/list-legal-entity-query.dto';
import { UpdateLegalEntityDto } from '../dto/update-legal-entity.dto';
import { LegalEntityService } from '../../application/services/legal-entity.service';

@Controller('legal-entities')
@UseGuards(AuthGuard, PermissionsGuard)
export class LegalEntityController {
  constructor(@Inject(LegalEntityService) private readonly service: LegalEntityService) {}

  @Get()
  @Permissions(Permission.LegalEntityView)
  findAll(@Query() query: ListLegalEntityQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Permissions(Permission.LegalEntityView)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/usage')
  @Permissions(Permission.LegalEntityView)
  usage(@Param('id') id: string) {
    return this.service.usage(id);
  }

  @Post()
  @Permissions(Permission.LegalEntityCreate)
  create(@Body() dto: CreateLegalEntityDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.create(dto, request.user?.sub ?? 'system');
  }

  @Patch(':id')
  @Permissions(Permission.LegalEntityEdit)
  update(@Param('id') id: string, @Body() dto: UpdateLegalEntityDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.update(id, dto, request.user?.sub ?? 'system');
  }

  @Post(':id/block')
  @Permissions(Permission.LegalEntityBlock)
  block(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.service.block(id, request.user?.sub ?? 'system');
  }

  @Post(':id/unblock')
  @Permissions(Permission.LegalEntityBlock)
  unblock(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.service.unblock(id, request.user?.sub ?? 'system');
  }
}
