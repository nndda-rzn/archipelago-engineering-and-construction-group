import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { MasterDataController } from './presentation/controllers/master-data.controller';
import { MasterDataService } from './application/services/master-data.service';

@Module({
  imports: [],
  controllers: [MasterDataController],
  providers: [MasterDataService, PrismaService],
})
export class MasterDataModule {}
