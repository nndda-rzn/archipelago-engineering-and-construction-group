import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { Permissions } from '@/auth/permissions.decorator';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { AuditService } from './audit.service';

class ListAuditQueryDto {
  page?: number;
  pageSize?: number;
  action?: string;
  resource?: string;
}

@Controller('audit-logs')
@UseGuards(AuthGuard, PermissionsGuard)
export class AuditController {
  constructor(@Inject(AuditService) private readonly service: AuditService) {}

  @Get()
  @Permissions('Audit.VIEW')
  findAll(@Query() query: ListAuditQueryDto) {
    return this.service.findAll(query);
  }
}
