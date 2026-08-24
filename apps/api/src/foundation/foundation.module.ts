import { Module } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AuthModule } from '@/auth/auth.module';
import { LegalEntityController } from './legal-entity.controller';
import { LegalEntityService } from './legal-entity.service';

@Module({
  imports: [AuthModule],
  controllers: [LegalEntityController],
  providers: [LegalEntityService, PrismaService],
})
export class FoundationModule {}
