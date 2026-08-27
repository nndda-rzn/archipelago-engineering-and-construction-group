import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { HcmController } from './presentation/controllers/hcm.controller';
import { EmployeeService } from './application/services/employee.service';
import { EquipmentService } from './application/services/equipment.service';

@Module({
  imports: [],
  controllers: [HcmController],
  providers: [EmployeeService, EquipmentService, PrismaService],
})
export class HcmModule {}
