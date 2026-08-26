import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import {
  ApproveTimesheetDto, CreateEmployeeDto, CreateProjectAssignmentDto, CreateTimesheetDto,
  EndAssignmentDto, ListEmployeeQueryDto, ListTimesheetQueryDto,
} from '../dto/hcm.dto';
import { EmployeeService } from '../../application/services/employee.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class HcmController {
  constructor(
    @Inject(EmployeeService) private readonly employee: EmployeeService,
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
}
