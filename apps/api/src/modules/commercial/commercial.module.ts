import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { CommercialController } from './presentation/controllers/commercial.controller';
import { CommercialService } from './application/services/commercial.service';

@Module({
  imports: [],
  controllers: [CommercialController],
  providers: [CommercialService, PrismaService],
})
export class CommercialModule {}
