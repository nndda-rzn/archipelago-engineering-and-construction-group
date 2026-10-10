import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
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

/** Masa berlaku sesi (harus selaras dengan expiresIn JWT di foundation.module). */
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

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

  async login(dto: LoginDto, ctx: { ipAddress?: string; userAgent?: string } = {}) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || user.status !== 'ACTIVE' || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      const type = !user ? 'FAILED_UNKNOWN' : user.status !== 'ACTIVE' ? 'FAILED_STATUS' : 'FAILED_PASSWORD';
      await this.prisma.loginEvent.create({
        data: { userId: user?.id ?? null, email: dto.email, type, ipAddress: ctx.ipAddress ?? null, userAgent: ctx.userAgent ?? null, reason: user ? 'Incorrect password' : 'Unknown account' },
      });
      if (user) {
        await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: { increment: 1 }, lastFailedLoginAt: new Date() } });
        await this.audit.record({ userId: user.id, action: 'AUTH.LOGIN_FAILED', resource: 'Auth', reason: 'Incorrect password', source: 'api' });
      }
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password' });
    }

    const now = new Date();
    const tokenId = randomUUID();
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now, failedLoginCount: 0 } });
    await this.prisma.userSession.create({
      data: { userId: user.id, tokenId, ipAddress: ctx.ipAddress ?? null, userAgent: ctx.userAgent ?? null, createdAt: now, lastSeenAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) },
    });
    await this.prisma.loginEvent.create({
      data: { userId: user.id, email: user.email, type: 'SUCCESS', ipAddress: ctx.ipAddress ?? null, userAgent: ctx.userAgent ?? null },
    });

    await this.audit.record({ userId: user.id, action: 'AUTH.LOGIN_SUCCESS', resource: 'Auth', source: 'api' });

    const roles = user.userRoles.filter((assignment) => assignment.role.status === 'ACTIVE').map((assignment) => assignment.role.code);
    const permissions = await this.permissionsOf(user.id);
    const payload = { sub: user.id, email: user.email, roles, jti: tokenId };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName, roles, permissions },
    };
  }

  /** Cabut sesi berjalan milik token ini (logout). */
  async logout(tokenId: string | undefined, userId: string) {
    if (!tokenId) return { revoked: 0 };
    const res = await this.prisma.userSession.updateMany({ where: { tokenId, userId, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: new Date(), revokedById: userId } });
    return { revoked: res.count };
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
