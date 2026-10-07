import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from './audit.service';
import type { LoginDto } from '../../presentation/dto/login.dto';
export type AuthUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  roles: string[];
  permissions: string[];
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /**
   * Kode permission yang aktif dipegang user. Sumbernya sama dengan yang
   * ditegakkan `PermissionsGuard` (userRole → role → rolePermission → permission,
   * assignment yang belum kedaluwarsa saja). Dipakai frontend untuk menyembunyikan
   * menu/route/widget yang tidak diizinkan, jadi daftar ini harus konsisten dengan
   * keputusan guard backend.
   */
  private async permissionsOf(userId: string): Promise<string[]> {
    const assignments = await this.prisma.userRole.findMany({
      where: { userId, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    const codes = new Set<string>();
    for (const assignment of assignments) {
      for (const rp of assignment.role.permissions) codes.add(rp.permission.code);
    }
    return [...codes].sort();
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || user.status !== 'ACTIVE' || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      if (user) {
        await this.audit.record({
          userId: user.id,
          action: 'AUTH.LOGIN_FAILED',
          resource: 'Auth',
          reason: 'Incorrect password',
          source: 'api',
        });
      }
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password' });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.record({
      userId: user.id,
      action: 'AUTH.LOGIN_SUCCESS',
      resource: 'Auth',
      source: 'api',
    });

    const roles = user.userRoles.filter((assignment) => assignment.role.status === 'ACTIVE').map((assignment) => assignment.role.code);
    const permissions = await this.permissionsOf(user.id);
    const payload = { sub: user.id, email: user.email, roles };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName, roles, permissions },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({ code: 'USER_INACTIVE', message: 'User is inactive' });
    }
    const roles = user.userRoles.filter((assignment) => assignment.role.status === 'ACTIVE').map((assignment) => assignment.role.code);
    const permissions = await this.permissionsOf(user.id);
    return { id: user.id, email: user.email, username: user.username, displayName: user.displayName, roles, permissions };
  }
}
