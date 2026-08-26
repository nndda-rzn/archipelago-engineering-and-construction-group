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
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

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
          reason: 'Password salah',
          source: 'api',
        });
      }
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Email atau password salah' });
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
    const payload = { sub: user.id, email: user.email, roles };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName, roles },
    };
  }

  /** Ambil profil user aktif dari token (GET /auth/me). */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({ code: 'USER_INACTIVE', message: 'User tidak aktif' });
    }
    const roles = user.userRoles.filter((assignment) => assignment.role.status === 'ACTIVE').map((assignment) => assignment.role.code);
    return { id: user.id, email: user.email, username: user.username, displayName: user.displayName, roles };
  }
}
