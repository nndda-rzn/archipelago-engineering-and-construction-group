import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/database/prisma.service';
import type { LoginDto } from './dto/login.dto';

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
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || user.status !== 'ACTIVE' || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Email atau password salah' });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const roles = user.userRoles.filter((assignment) => assignment.role.status === 'ACTIVE').map((assignment) => assignment.role.code);
    const payload = { sub: user.id, email: user.email, roles };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName, roles },
    };
  }
}
