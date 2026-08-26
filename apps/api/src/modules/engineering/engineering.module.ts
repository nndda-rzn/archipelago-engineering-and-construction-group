import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { EngineeringController } from './presentation/controllers/engineering.controller';
import { EngineeringService } from './application/services/engineering.service';

@Module({
  imports: [],
  controllers: [EngineeringController],
  providers: [EngineeringService, PrismaService],
})
export class EngineeringModule {}
