import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ConstructionController } from './presentation/controllers/construction.controller';
import { WorkPackageService } from './application/services/work-package.service';

@Module({
  imports: [],
  controllers: [ConstructionController],
  providers: [PrismaService, WorkPackageService],
})
export class ConstructionModule {}
