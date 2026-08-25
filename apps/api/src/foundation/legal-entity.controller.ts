import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { CreateLegalEntityDto } from './dto/create-legal-entity.dto';
import { ListLegalEntityQueryDto } from './dto/list-legal-entity-query.dto';
import { UpdateLegalEntityDto } from './dto/update-legal-entity.dto';
import { LegalEntityService } from './legal-entity.service';

@Controller('legal-entities')
@UseGuards(AuthGuard, PermissionsGuard)
export class LegalEntityController {
  constructor(@Inject(LegalEntityService) private readonly service: LegalEntityService) {}

  @Get()
  @Permissions('LegalEntity.VIEW')
  findAll(@Query() query: ListLegalEntityQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Permissions('LegalEntity.VIEW')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('LegalEntity.CREATE')
  create(@Body() dto: CreateLegalEntityDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('LegalEntity.EDIT')
  update(@Param('id') id: string, @Body() dto: UpdateLegalEntityDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/block')
  @Permissions('LegalEntity.BLOCK')
  block(@Param('id') id: string) {
    return this.service.block(id);
  }
}
