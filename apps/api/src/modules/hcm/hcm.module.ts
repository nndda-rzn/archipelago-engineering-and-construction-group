import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { HcmController } from './presentation/controllers/hcm.controller';
import { EmployeeService } from './application/services/employee.service';

@Module({
  imports: [],
  controllers: [HcmController],
  providers: [EmployeeService, PrismaService],
})
export class HcmModule {}
