import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
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
  @Permissions('Employee.VIEW')
  listEmployees(@Query() query: ListEmployeeQueryDto) {
    return this.employee.listEmployees(query);
  }

  @Post('employees')
  @Permissions('Employee.CREATE')
  createEmployee(@Body() dto: CreateEmployeeDto, @Req() request: { user?: { sub?: string } }) {
    return this.employee.createEmployee(dto, request.user?.sub ?? 'system');
  }

  @Post('employees/:id/status')
  @Permissions('Employee.CREATE')
  changeEmployeeStatus(@Param('id') id: string, @Body() dto: ChangeEmployeeStatusDto, @Req() request: { user?: { sub?: string } }) {
    return this.employee.changeEmployeeStatus(id, dto, request.user?.sub ?? 'system');
  }

  @Get('employees/:id/assignments')
  @Permissions('Employee.VIEW')
  listAssignments(@Param('id') id: string) {
    return this.employee.listAssignments(id);
  }

  @Post('employees/:id/assignments')
  @Permissions('EmployeeAssignment.CREATE')
  createAssignment(@Param('id') id: string, @Body() dto: CreateProjectAssignmentDto, @Req() request: { user?: { sub?: string } }) {
    return this.employee.createAssignment(id, dto, request.user?.sub ?? 'system');
  }

  @Post('employees/:id/assignments/:assignmentId/end')
  @Permissions('EmployeeAssignment.CREATE')
  endAssignment(@Param('id') id: string, @Param('assignmentId') assignmentId: string, @Body() dto: EndAssignmentDto, @Req() request: { user?: { sub?: string } }) {
    return this.employee.endAssignment(id, assignmentId, dto, request.user?.sub ?? 'system');
  }

  @Get('timesheets')
  @Permissions('Timesheet.VIEW')
  listTimesheets(@Query() query: ListTimesheetQueryDto) {
    return this.employee.listTimesheets(query);
  }

  @Post('timesheets')
  @Permissions('Timesheet.CREATE')
  createTimesheet(@Body() dto: CreateTimesheetDto, @Req() request: { user?: { sub?: string } }) {
    return this.employee.createTimesheet(dto, request.user?.sub ?? 'system');
  }

  @Post('timesheets/:id/approve')
  @Permissions('Timesheet.APPROVE')
  approveTimesheet(@Param('id') id: string, @Body() dto: ApproveTimesheetDto, @Req() request: { user?: { sub?: string } }) {
    return this.employee.approveTimesheet(id, dto, request.user?.sub ?? 'system');
  }

  @Get('payroll-allocations')
  @Permissions('Payroll.VIEW')
  listPayrollAllocations(@Query() query: ListPayrollAllocationQueryDto) {
    return this.employee.listPayrollAllocations(query);
  }

  @Post('payroll-allocations')
  @Permissions('Payroll.CREATE')
  createPayrollAllocation(@Body() dto: CreatePayrollAllocationDto, @Req() request: { user?: { sub?: string } }) {
    return this.employee.createPayrollAllocation(dto, request.user?.sub ?? 'system');
  }

  // ─── Equipment (FR-EQP-001..006) ───
  @Get('equipment')
  @Permissions('Equipment.VIEW')
  listEquipment(@Query() query: ListEquipmentQueryDto) {
    return this.equipment.listEquipment(query);
  }

  @Post('equipment')
  @Permissions('Equipment.CREATE')
  createEquipment(@Body() dto: CreateEquipmentDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.createEquipment(dto, request.user?.sub ?? 'system');
  }

  @Get('equipment/:id/assignments')
  @Permissions('Equipment.VIEW')
  listEquipmentAssignments(@Param('id') id: string) {
    return this.equipment.listAssignments(id);
  }

  @Post('equipment/:id/assignments')
  @Permissions('EquipmentAssignment.CREATE')
  createEquipmentAssignment(@Param('id') id: string, @Body() dto: CreateEquipmentAssignmentDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.createAssignment(id, dto, request.user?.sub ?? 'system');
  }

  @Post('equipment/:id/assignments/:assignmentId/end')
  @Permissions('EquipmentAssignment.CREATE')
  endEquipmentAssignment(@Param('id') id: string, @Param('assignmentId') assignmentId: string, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.endAssignment(id, assignmentId, request.user?.sub ?? 'system');
  }

  @Get('equipment/:id/utilizations')
  @Permissions('Equipment.VIEW')
  listEquipmentUtilizations(@Param('id') id: string) {
    return this.equipment.listUtilizations(id);
  }

  @Post('equipment/:id/utilizations')
  @Permissions('Equipment.OPERATE')
  createEquipmentUtilization(@Param('id') id: string, @Body() dto: CreateEquipmentUtilizationDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.createUtilization(id, dto, request.user?.sub ?? 'system');
  }

  @Get('equipment/:id/pms')
  @Permissions('Equipment.VIEW')
  listEquipmentPms(@Param('id') id: string) {
    return this.equipment.listPms(id);
  }

  @Post('equipment/:id/pms')
  @Permissions('Equipment.PM')
  createEquipmentPm(@Param('id') id: string, @Body() dto: CreateEquipmentPmDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.createPm(id, dto, request.user?.sub ?? 'system');
  }

  @Post('equipment/:id/pms/:pmId/complete')
  @Permissions('Equipment.PM')
  completeEquipmentPm(@Param('id') id: string, @Param('pmId') pmId: string, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.completePm(id, pmId, request.user?.sub ?? 'system');
  }

  @Get('equipment/:id/breakdowns')
  @Permissions('Equipment.VIEW')
  listEquipmentBreakdowns(@Param('id') id: string) {
    return this.equipment.listBreakdowns(id);
  }

  @Post('equipment/:id/breakdowns')
  @Permissions('Equipment.OPERATE')
  createEquipmentBreakdown(@Param('id') id: string, @Body() dto: CreateEquipmentBreakdownDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.createBreakdown(id, dto, request.user?.sub ?? 'system');
  }

  @Post('equipment/:id/breakdowns/:breakdownId/resolve')
  @Permissions('Equipment.OPERATE')
  resolveEquipmentBreakdown(@Param('id') id: string, @Param('breakdownId') breakdownId: string, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.resolveBreakdown(id, breakdownId, request.user?.sub ?? 'system');
  }

  @Get('equipment/:id/usages')
  @Permissions('Equipment.VIEW')
  listEquipmentUsages(@Param('id') id: string) {
    return this.equipment.listUsages(id);
  }

  @Post('equipment/:id/usages')
  @Permissions('Equipment.OPERATE')
  createEquipmentUsage(@Param('id') id: string, @Body() dto: CreateEquipmentUsageDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipment.createUsage(id, dto, request.user?.sub ?? 'system');
  }
}
