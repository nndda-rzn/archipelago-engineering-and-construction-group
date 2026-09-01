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
import { EmployeeMasterService } from '../../application/services/employee-master.service';
import { ProjectAssignmentService } from '../../application/services/project-assignment.service';
import { TimesheetService } from '../../application/services/timesheet.service';
import { PayrollAllocationService } from '../../application/services/payroll-allocation.service';
import { EmployeeLifecycleService } from '../../application/services/employee-lifecycle.service';
import { EquipmentMasterService } from '../../application/services/equipment-master.service';
import { EquipmentAssignmentService } from '../../application/services/equipment-assignment.service';
import { EquipmentUtilizationService } from '../../application/services/equipment-utilization.service';
import { EquipmentMaintenanceService } from '../../application/services/equipment-maintenance.service';
import { EquipmentUsageService } from '../../application/services/equipment-usage.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class HcmController {
  constructor(
    @Inject(EmployeeMasterService) private readonly employeeMaster: EmployeeMasterService,
    @Inject(ProjectAssignmentService) private readonly projectAssignment: ProjectAssignmentService,
    @Inject(TimesheetService) private readonly timesheet: TimesheetService,
    @Inject(PayrollAllocationService) private readonly payroll: PayrollAllocationService,
    @Inject(EmployeeLifecycleService) private readonly employeeLifecycle: EmployeeLifecycleService,
    @Inject(EquipmentMasterService) private readonly equipmentMaster: EquipmentMasterService,
    @Inject(EquipmentAssignmentService) private readonly equipmentAssignment: EquipmentAssignmentService,
    @Inject(EquipmentUtilizationService) private readonly equipmentUtilization: EquipmentUtilizationService,
    @Inject(EquipmentMaintenanceService) private readonly equipmentMaintenance: EquipmentMaintenanceService,
    @Inject(EquipmentUsageService) private readonly equipmentUsage: EquipmentUsageService,
  ) {}

  // ─── Employee (FR-HCM-001) ──────────────────────────────────────────────────

  @Get('employees')
  @Permissions(Permission.EmployeeView)
  listEmployees(@Query() query: ListEmployeeQueryDto) {
    return this.employeeMaster.listEmployees(query);
  }

  @Post('employees')
  @Permissions(Permission.EmployeeCreate)
  createEmployee(@Body() dto: CreateEmployeeDto, @Req() request: { user?: { sub?: string } }) {
    return this.employeeMaster.createEmployee(dto, request.user?.sub ?? 'system');
  }

  @Post('employees/:id/status')
  @Permissions(Permission.EmployeeCreate)
  changeEmployeeStatus(@Param('id') id: string, @Body() dto: ChangeEmployeeStatusDto, @Req() request: { user?: { sub?: string } }) {
    return this.employeeLifecycle.changeEmployeeStatus(id, dto, request.user?.sub ?? 'system');
  }

  // ─── Project Assignment (FR-HCM-002/003) ────────────────────────────────────

  @Get('employees/:id/assignments')
  @Permissions(Permission.EmployeeView)
  listAssignments(@Param('id') id: string) {
    return this.projectAssignment.listAssignments(id);
  }

  @Post('employees/:id/assignments')
  @Permissions(Permission.EmployeeAssignmentCreate)
  createAssignment(@Param('id') id: string, @Body() dto: CreateProjectAssignmentDto, @Req() request: { user?: { sub?: string } }) {
    return this.projectAssignment.createAssignment(id, dto, request.user?.sub ?? 'system');
  }

  @Post('employees/:id/assignments/:assignmentId/end')
  @Permissions(Permission.EmployeeAssignmentCreate)
  endAssignment(@Param('id') id: string, @Param('assignmentId') assignmentId: string, @Body() dto: EndAssignmentDto, @Req() request: { user?: { sub?: string } }) {
    return this.projectAssignment.endAssignment(id, assignmentId, dto, request.user?.sub ?? 'system');
  }

  // ─── Timesheet (FR-HCM-004) ─────────────────────────────────────────────────

  @Get('timesheets')
  @Permissions(Permission.TimesheetView)
  listTimesheets(@Query() query: ListTimesheetQueryDto) {
    return this.timesheet.listTimesheets(query);
  }

  @Post('timesheets')
  @Permissions(Permission.TimesheetCreate)
  createTimesheet(@Body() dto: CreateTimesheetDto, @Req() request: { user?: { sub?: string } }) {
    return this.timesheet.createTimesheet(dto, request.user?.sub ?? 'system');
  }

  @Post('timesheets/:id/approve')
  @Permissions(Permission.TimesheetApprove)
  approveTimesheet(@Param('id') id: string, @Body() dto: ApproveTimesheetDto, @Req() request: { user?: { sub?: string } }) {
    return this.timesheet.approveTimesheet(id, dto, request.user?.sub ?? 'system');
  }

  // ─── Payroll Allocation (FR-HCM-005) ────────────────────────────────────────

  @Get('payroll-allocations')
  @Permissions(Permission.PayrollView)
  listPayrollAllocations(@Query() query: ListPayrollAllocationQueryDto) {
    return this.payroll.listPayrollAllocations(query);
  }

  @Post('payroll-allocations')
  @Permissions(Permission.PayrollCreate)
  createPayrollAllocation(@Body() dto: CreatePayrollAllocationDto, @Req() request: { user?: { sub?: string } }) {
    return this.payroll.createPayrollAllocation(dto, request.user?.sub ?? 'system');
  }

  // ─── Equipment Master (FR-EQP-001) ──────────────────────────────────────────

  @Get('equipment')
  @Permissions(Permission.EquipmentView)
  listEquipment(@Query() query: ListEquipmentQueryDto) {
    return this.equipmentMaster.listEquipment(query);
  }

  @Post('equipment')
  @Permissions(Permission.EquipmentCreate)
  createEquipment(@Body() dto: CreateEquipmentDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipmentMaster.createEquipment(dto, request.user?.sub ?? 'system');
  }

  // ─── Equipment Assignment (FR-EQP-002) ──────────────────────────────────────

  @Get('equipment/:id/assignments')
  @Permissions(Permission.EquipmentView)
  listEquipmentAssignments(@Param('id') id: string) {
    return this.equipmentAssignment.listAssignments(id);
  }

  @Post('equipment/:id/assignments')
  @Permissions(Permission.EquipmentAssignmentCreate)
  createEquipmentAssignment(@Param('id') id: string, @Body() dto: CreateEquipmentAssignmentDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipmentAssignment.createAssignment(id, dto, request.user?.sub ?? 'system');
  }

  @Post('equipment/:id/assignments/:assignmentId/end')
  @Permissions(Permission.EquipmentAssignmentCreate)
  endEquipmentAssignment(@Param('id') id: string, @Param('assignmentId') assignmentId: string, @Req() request: { user?: { sub?: string } }) {
    return this.equipmentAssignment.endAssignment(id, assignmentId, request.user?.sub ?? 'system');
  }

  // ─── Equipment Utilization (FR-EQP-003) ─────────────────────────────────────

  @Get('equipment/:id/utilizations')
  @Permissions(Permission.EquipmentView)
  listEquipmentUtilizations(@Param('id') id: string) {
    return this.equipmentUtilization.listUtilizations(id);
  }

  @Post('equipment/:id/utilizations')
  @Permissions(Permission.EquipmentOperate)
  createEquipmentUtilization(@Param('id') id: string, @Body() dto: CreateEquipmentUtilizationDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipmentUtilization.createUtilization(id, dto, request.user?.sub ?? 'system');
  }

  // ─── Equipment Maintenance (FR-EQP-004/005) ──────────────────────────────────

  @Get('equipment/:id/pms')
  @Permissions(Permission.EquipmentView)
  listEquipmentPms(@Param('id') id: string) {
    return this.equipmentMaintenance.listPms(id);
  }

  @Post('equipment/:id/pms')
  @Permissions(Permission.EquipmentPm)
  createEquipmentPm(@Param('id') id: string, @Body() dto: CreateEquipmentPmDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipmentMaintenance.createPm(id, dto, request.user?.sub ?? 'system');
  }

  @Post('equipment/:id/pms/:pmId/complete')
  @Permissions(Permission.EquipmentPm)
  completeEquipmentPm(@Param('id') id: string, @Param('pmId') pmId: string, @Req() request: { user?: { sub?: string } }) {
    return this.equipmentMaintenance.completePm(id, pmId, request.user?.sub ?? 'system');
  }

  @Get('equipment/:id/breakdowns')
  @Permissions(Permission.EquipmentView)
  listEquipmentBreakdowns(@Param('id') id: string) {
    return this.equipmentMaintenance.listBreakdowns(id);
  }

  @Post('equipment/:id/breakdowns')
  @Permissions(Permission.EquipmentOperate)
  createEquipmentBreakdown(@Param('id') id: string, @Body() dto: CreateEquipmentBreakdownDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipmentMaintenance.createBreakdown(id, dto, request.user?.sub ?? 'system');
  }

  @Post('equipment/:id/breakdowns/:breakdownId/resolve')
  @Permissions(Permission.EquipmentOperate)
  resolveEquipmentBreakdown(@Param('id') id: string, @Param('breakdownId') breakdownId: string, @Req() request: { user?: { sub?: string } }) {
    return this.equipmentMaintenance.resolveBreakdown(id, breakdownId, request.user?.sub ?? 'system');
  }

  // ─── Equipment Usage (FR-EQP-006) ───────────────────────────────────────────

  @Get('equipment/:id/usages')
  @Permissions(Permission.EquipmentView)
  listEquipmentUsages(@Param('id') id: string) {
    return this.equipmentUsage.listUsages(id);
  }

  @Post('equipment/:id/usages')
  @Permissions(Permission.EquipmentOperate)
  createEquipmentUsage(@Param('id') id: string, @Body() dto: CreateEquipmentUsageDto, @Req() request: { user?: { sub?: string } }) {
    return this.equipmentUsage.createUsage(id, dto, request.user?.sub ?? 'system');
  }
}
