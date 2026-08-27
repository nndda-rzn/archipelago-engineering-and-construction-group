import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { TreasuryController } from './presentation/controllers/treasury.controller';
import { TreasuryService } from './application/services/treasury.service';

@Module({
  imports: [],
  controllers: [TreasuryController],
  providers: [TreasuryService, PrismaService],
})
export class TreasuryModule {}
