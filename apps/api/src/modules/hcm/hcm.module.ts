import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { SharedModule } from '@/shared/shared.module';
import { HcmController } from './presentation/controllers/hcm.controller';
import { EmployeeMasterService } from './application/services/employee-master.service';
import { ProjectAssignmentService } from './application/services/project-assignment.service';
import { TimesheetService } from './application/services/timesheet.service';
import { PayrollAllocationService } from './application/services/payroll-allocation.service';
import { EmployeeLifecycleService } from './application/services/employee-lifecycle.service';
import { EquipmentMasterService } from './application/services/equipment-master.service';
import { EquipmentAssignmentService } from './application/services/equipment-assignment.service';
import { EquipmentUtilizationService } from './application/services/equipment-utilization.service';
import { EquipmentMaintenanceService } from './application/services/equipment-maintenance.service';
import { EquipmentUsageService } from './application/services/equipment-usage.service';

@Module({
  imports: [SharedModule],
  controllers: [HcmController],
  providers: [
    PrismaService,
    EmployeeMasterService,
    ProjectAssignmentService,
    TimesheetService,
    PayrollAllocationService,
    EmployeeLifecycleService,
    EquipmentMasterService,
    EquipmentAssignmentService,
    EquipmentUtilizationService,
    EquipmentMaintenanceService,
    EquipmentUsageService,
  ],
})
export class HcmModule {}
