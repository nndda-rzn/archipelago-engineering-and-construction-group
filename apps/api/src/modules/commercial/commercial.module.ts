import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { CommercialController } from './presentation/controllers/commercial.controller';
import { TenderController } from './presentation/controllers/tender.controller';
import { CommercialService } from './application/services/commercial.service';
import { TenderService } from './application/services/tender.service';

@Module({
  imports: [],
  controllers: [CommercialController, TenderController],
  providers: [CommercialService, TenderService, PrismaService],
})
export class CommercialModule {}
