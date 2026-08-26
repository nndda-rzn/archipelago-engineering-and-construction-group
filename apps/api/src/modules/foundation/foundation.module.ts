import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Reflector } from '@nestjs/core';
import { AuthController } from './presentation/controllers/auth.controller';
import { AuditController } from './presentation/controllers/audit-log.controller';
import { UserController } from './presentation/controllers/user.controller';
import { RoleController } from './presentation/controllers/role.controller';
import { LegalEntityController } from './presentation/controllers/legal-entity.controller';
import { FoundationHardeningController } from './presentation/controllers/foundation-hardening.controller';
import { AuthService } from './application/services/auth.service';
import { AuditService } from './application/services/audit.service';
import { UserService } from './application/services/user.service';
import { RoleService } from './application/services/role.service';
import { LegalEntityService } from './application/services/legal-entity.service';
import { FoundationHardeningService } from './application/services/foundation-hardening.service';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-only-change-me',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController, AuditController, UserController, RoleController, LegalEntityController, FoundationHardeningController],
  providers: [AuthService, AuditService, UserService, RoleService, LegalEntityService, FoundationHardeningService, PrismaService, Reflector, AuthGuard, PermissionsGuard],
  exports: [AuthService, AuditService, JwtModule, AuthGuard, PermissionsGuard],
})
export class FoundationModule {}