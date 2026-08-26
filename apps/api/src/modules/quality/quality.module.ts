import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { QualityController } from './presentation/controllers/quality.controller';
import { QualityService } from './application/services/quality.service';

@Module({
  imports: [],
  controllers: [QualityController],
  providers: [QualityService, PrismaService],
})
export class QualityModule {}
