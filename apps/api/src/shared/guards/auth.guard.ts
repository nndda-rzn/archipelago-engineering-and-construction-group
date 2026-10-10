import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/shared/database/prisma.service';

interface JwtPayload {
  sub?: string;
  jti?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: unknown }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Bearer token is required' });

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Token is invalid or expired' });
    }

    // Verifikasi sesi nyata bila token membawa `jti` (token hasil login baru).
    // Sesi yang dicabut (block/force-logout/reset password) langsung tak berlaku.
    // Token lama tanpa `jti` tetap diterima demi kompatibilitas (mis. test lama).
    if (payload.jti) {
      const session = await this.prisma.userSession.findUnique({ where: { tokenId: payload.jti } });
      if (!session || session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
        throw new UnauthorizedException({ code: 'SESSION_REVOKED', message: 'Your session has ended. Please sign in again.' });
      }
    }

    request.user = payload;
    return true;
  }
}
