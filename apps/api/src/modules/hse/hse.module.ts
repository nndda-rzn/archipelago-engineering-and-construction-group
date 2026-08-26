import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { HseController } from './presentation/controllers/hse.controller';
import { HseService } from './application/services/hse.service';

@Module({
  imports: [],
  controllers: [HseController],
  providers: [HseService, PrismaService],
})
export class HseModule {}
