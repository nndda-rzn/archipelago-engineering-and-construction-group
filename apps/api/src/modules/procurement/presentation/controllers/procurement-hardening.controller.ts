import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { RfqService } from '../../application/services/rfq.service';
import { PurchaseRequisitionService } from '../../application/services/purchase-requisition.service';
import { ProcurementHardeningService } from '../../application/services/procurement-hardening.service';
import { CreatePoChangeDto, CreateVendorRatingDto, ListRatingQueryDto, TechnicalReviewDto } from '../dto/procurement-hardening.dto';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class ProcurementHardeningController {
  constructor(
    @Inject(RfqService) private readonly rfq: RfqService,
    @Inject(PurchaseRequisitionService) private readonly pr: PurchaseRequisitionService,
    @Inject(ProcurementHardeningService) private readonly hardening: ProcurementHardeningService,
  ) {}

  @Get('projects/:projectId/budget-status')
  @Permissions(Permission.ProjectView)
  budgetStatus(@Param('projectId') projectId: string) {
    return this.pr.budgetStatus(projectId);
  }

  @Post('rfq-quotes/:id/technical-review')
  @Permissions(Permission.RfqEvaluate)
  technicalReview(@Param('id') id: string, @Body() dto: TechnicalReviewDto, @Req() request: { user?: { sub?: string } }) {
    return this.rfq.technicalReview(id, dto.technicalStatus, dto.technicalNote ?? null, request.user?.sub ?? 'system');
  }

  @Get('rfqs/:id/commercial-evaluation')
  @Permissions(Permission.RfqEvaluate)
  commercialEvaluation(@Param('id') id: string) {
    return this.rfq.commercialEvaluation(id);
  }

  @Post('purchase-orders/:id/po-changes')
  @Permissions(Permission.PurchaseOrderCreate)
  createPoChange(@Param('id') id: string, @Body() dto: CreatePoChangeDto, @Req() request: { user?: { sub?: string } }) {
    return this.hardening.createPoChange(id, dto, request.user?.sub ?? 'system');
  }

  @Get('purchase-orders/:id/po-changes')
  @Permissions(Permission.PurchaseOrderView)
  listPoChanges(@Param('id') id: string) {
    return this.hardening.listPoChanges(id);
  }

  @Post('po-changes/:id/approve')
  @Permissions(Permission.PurchaseOrderApprove)
  approvePoChange(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.hardening.approvePoChange(id, request.user?.sub ?? 'system');
  }

  @Get('vendor-performance')
  @Permissions(Permission.VendorView)
  listRatings(@Query() query: ListRatingQueryDto) {
    return this.hardening.listRatings(query);
  }

  @Post('vendor-performance')
  @Permissions(Permission.VendorCreate)
  createRating(@Body() dto: CreateVendorRatingDto, @Req() request: { user?: { sub?: string } }) {
    return this.hardening.createRating(dto, request.user?.sub ?? 'system');
  }

  @Get('vendor-performance/summary')
  @Permissions(Permission.VendorView)
  vendorPerformanceSummary() {
    return this.hardening.vendorPerformanceSummary();
  }
}
