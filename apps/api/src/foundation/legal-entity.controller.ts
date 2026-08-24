import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { Permissions } from '@/auth/permissions.decorator';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { CreateLegalEntityDto } from './dto/create-legal-entity.dto';
import { UpdateLegalEntityDto } from './dto/update-legal-entity.dto';
import { LegalEntityService } from './legal-entity.service';

@Controller('legal-entities')
@UseGuards(AuthGuard, PermissionsGuard)
export class LegalEntityController {
  constructor(@Inject(LegalEntityService) private readonly service: LegalEntityService) {}

  @Get()
  @Permissions('LegalEntity.VIEW')
  findAll() {
    return this.service.findAll();
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
