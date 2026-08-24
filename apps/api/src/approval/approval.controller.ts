import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { Permissions } from '@/auth/permissions.decorator';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { ApprovalService } from './approval.service';
import { ApproveTaskDto, SubmitForApprovalDto } from './dto/approval.dto';

@Controller('approvals')
@UseGuards(AuthGuard, PermissionsGuard)
export class ApprovalController {
  constructor(@Inject(ApprovalService) private readonly service: ApprovalService) {}

  @Get()
  @Permissions('Approval.VIEW')
  listTasks(@Req() request: { user?: { sub?: string } }) {
    return this.service.listTasks(request.user?.sub ?? 'system');
  }

  @Post('submit')
  @Permissions('Approval.SUBMIT')
  submit(@Body() dto: SubmitForApprovalDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.submitForApproval(dto, request.user?.sub ?? 'system');
  }

  @Post('decide')
  @Permissions('Approval.APPROVE')
  decide(@Body() dto: ApproveTaskDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.decide(dto, request.user?.sub ?? 'system');
  }
}
