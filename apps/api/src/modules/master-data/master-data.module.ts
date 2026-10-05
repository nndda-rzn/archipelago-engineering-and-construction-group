import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared/shared.module';
import { MasterDataController } from './presentation/controllers/master-data.controller';
import { MasterDataService } from './application/services/master-data.service';

@Module({
  imports: [SharedModule],
  controllers: [MasterDataController],
  providers: [MasterDataService],
})
export class MasterDataModule {}
