import { Module } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AuthModule } from '@/auth/auth.module';
import { LegalEntityController } from './legal-entity.controller';
import { LegalEntityService } from './legal-entity.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';

@Module({
  imports: [AuthModule],
  controllers: [LegalEntityController, UserController, RoleController],
  providers: [LegalEntityService, UserService, RoleService, PrismaService],
})
export class FoundationModule {}
