import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import {
  ApproveTimesheetDto, CreateEmployeeDto, CreateProjectAssignmentDto, CreateTimesheetDto,
  EndAssignmentDto, ListEmployeeQueryDto, ListTimesheetQueryDto,
  CreatePayrollAllocationDto, ListPayrollAllocationQueryDto, ChangeEmployeeStatusDto,
} from '../dto/hcm.dto';
import {
  CreateEquipmentAssignmentDto, CreateEquipmentBreakdownDto, CreateEquipmentDto, CreateEquipmentPmDto,
  CreateEquipmentUsageDto, CreateEquipmentUtilizationDto, ListEquipmentQueryDto,
} from '../dto/equipment.dto';
import { EmployeeService } from '../../application/services/employee.service';
import { EquipmentService } from '../../application/services/equipment.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class HcmController {
  constructor(
    @Inject(EmployeeService) private readonly employee: EmployeeService,
    @Inject(EquipmentService) private readonly equipment: EquipmentService,
  ) {}

  @Get('employees')
  @Permissions(Permission.EmployeeView)
  listEmployees(@Query() query: ListEmployeeQueryDto) {
    return this.employee.listEmployees(query);
  }

  @Post('employees')
  @Permissions(Permission.EmployeeCreate)
  createEmployee(@Body() dto: CreateEmployeeDto, @Req() request: { user?: { sub?: string } }) {
    return this.employee.createEmployee(dto, request.user?.sub ?? 'system');
  }

  @Post('employees/:id/status')
  @Permissions(Permission.EmployeeCreate)
  changeEmployeeStatus(@Param('id') id: string, @Body() dto: ChangeEmployeeStatusDto, @Req() request: { user?: { sub?: string } }) {
    return this.employee.changeEmployeeStatus(id, dto, request.user?.sub ?? 'system');
  }

  @Get('employees/:id/assignments')
  @Permissions(Permission.EmployeeView)
  listAssignments(@Param('id') id: string) {
    return this.employee.listAssignments(id);
  }

  @Post('employees/:id/assignments')
  @Permissions(Permission.EmployeeAssignmentCreate)
  createAssignment(@Param('id') id: string, @Body() dto: CreateProjectAssignmentDto, @Req() request: { user?: { sub?: string } }) {
    return this.employee.createAssignment(id, dto, request.user?.sub ?? 'system');
  }

  @Post('employees/:id/assignments/:assignmentId/end')
  @Permissions(Permission.EmployeeAssignmentCreate)
  endAssignment(@Param('id') id: string, @Param('assignmentId') assignmentId: string, @Body() dto: EndAssignmentDto, @Req() request: { user?: { sub?: string } }) {
    return this.employee.endAssignment(id, assignmentId, dto, request.user?.sub ?? 'system');
  }

  @Get('timesheets')
  @Permissions(Permission.TimesheetView)
  listTimesheets(@Query() query: ListTimesheetQueryDto) {
    return this.employee.listTimesheets(query);
  }

  @Post('timesheets')
  @Permissions(Permission.TimesheetCreate)
  createTimesheet(@Body() dto: CreateTimesheetDto, @Req() request: { user?: { sub?: string } }) {
    return this.employee.createTimesheet(dto, request.user?.sub ?? 'system');
  }

  @Post('timesheets/:id/approve')
  @Permissions(Permission.TimesheetApprove)
  approveTimesheet(@Param('id') id: string, @Body() dto: ApproveTimesheetDto, @Req() request: { user?: { sub?: string } }) {
    return this.employee.approveTimesheet(id, dto, request.user?.sub ?? 'system');
  }

  @Get('payroll-allocations')
  @Permissions(Permission.PayrollView)
  listPayrollAllocations(@Query() query: ListPayrollAllocationQueryDto) {
    return this.employee.listPayrollAllocations(query);
  }

  @Post('payroll-allocations')
  @Permissions(Permission.PayrollCreate)
  createPayrollAllocation(@Body() dto: CreatePayrollAllocationDto, @Req() request: { user?: { sub?: string } }) {
    return this.employee.createPayrollAllocation(dto, request.user?.sub ?? 'system');
  }

  // ─── Equipment (FR-EQP-001..006) ───
  @Get('equipment')
  @Permissions(Permission.EquipmentView)
  listEquipment(@Query() query: ListEquipmentQueryDto) {
    return this.equipment.listEquipment(query);
  }

  @Post('equipment')
  @Permissions(Permission.EquipmentCreate)
  createEquipment(@Body() dto: CreateEquipmentDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.createEquipment(dto, request.user?.sub ?? 'system');
  }

  @Get('equipment/:id/assignments')
  @Permissions(Permission.EquipmentView)
  listEquipmentAssignments(@Param('id') id: string) {
    return this.equipment.listAssignments(id);
  }

  @Post('equipment/:id/assignments')
  @Permissions(Permission.EquipmentAssignmentCreate)
  createEquipmentAssignment(@Param('id') id: string, @Body() dto: CreateEquipmentAssignmentDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.createAssignment(id, dto, request.user?.sub ?? 'system');
  }

  @Post('equipment/:id/assignments/:assignmentId/end')
  @Permissions(Permission.EquipmentAssignmentCreate)
  endEquipmentAssignment(@Param('id') id: string, @Param('assignmentId') assignmentId: string, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.endAssignment(id, assignmentId, request.user?.sub ?? 'system');
  }

  @Get('equipment/:id/utilizations')
  @Permissions(Permission.EquipmentView)
  listEquipmentUtilizations(@Param('id') id: string) {
    return this.equipment.listUtilizations(id);
  }

  @Post('equipment/:id/utilizations')
  @Permissions(Permission.EquipmentOperate)
  createEquipmentUtilization(@Param('id') id: string, @Body() dto: CreateEquipmentUtilizationDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.createUtilization(id, dto, request.user?.sub ?? 'system');
  }

  @Get('equipment/:id/pms')
  @Permissions(Permission.EquipmentView)
  listEquipmentPms(@Param('id') id: string) {
    return this.equipment.listPms(id);
  }

  @Post('equipment/:id/pms')
  @Permissions(Permission.EquipmentPm)
  createEquipmentPm(@Param('id') id: string, @Body() dto: CreateEquipmentPmDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.createPm(id, dto, request.user?.sub ?? 'system');
  }

  @Post('equipment/:id/pms/:pmId/complete')
  @Permissions(Permission.EquipmentPm)
  completeEquipmentPm(@Param('id') id: string, @Param('pmId') pmId: string, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.completePm(id, pmId, request.user?.sub ?? 'system');
  }

  @Get('equipment/:id/breakdowns')
  @Permissions(Permission.EquipmentView)
  listEquipmentBreakdowns(@Param('id') id: string) {
    return this.equipment.listBreakdowns(id);
  }

  @Post('equipment/:id/breakdowns')
  @Permissions(Permission.EquipmentOperate)
  createEquipmentBreakdown(@Param('id') id: string, @Body() dto: CreateEquipmentBreakdownDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.createBreakdown(id, dto, request.user?.sub ?? 'system');
  }

  @Post('equipment/:id/breakdowns/:breakdownId/resolve')
  @Permissions(Permission.EquipmentOperate)
  resolveEquipmentBreakdown(@Param('id') id: string, @Param('breakdownId') breakdownId: string, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.resolveBreakdown(id, breakdownId, request.user?.sub ?? 'system');
  }

  @Get('equipment/:id/usages')
  @Permissions(Permission.EquipmentView)
  listEquipmentUsages(@Param('id') id: string) {
    return this.equipment.listUsages(id);
  }

  @Post('equipment/:id/usages')
  @Permissions(Permission.EquipmentOperate)
  createEquipmentUsage(@Param('id') id: string, @Body() dto: CreateEquipmentUsageDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.createUsage(id, dto, request.user?.sub ?? 'system');
  }
}
