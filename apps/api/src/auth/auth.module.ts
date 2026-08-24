import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '@/database/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { Reflector } from '@nestjs/core';
import { AuditModule } from '@/audit/audit.module';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-only-change-me',
      signOptions: { expiresIn: '15m' },
    }),
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, Reflector, AuthGuard, PermissionsGuard],
  exports: [AuthService, JwtModule, AuthGuard, PermissionsGuard],
})
export class AuthModule {}
