import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { AuditService } from '../../application/services/audit.service';

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
  @Permissions(Permission.AuditView)
  findAll(@Query() query: ListAuditQueryDto) {
    return this.service.findAll(query);
  }
}
