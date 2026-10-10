import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/shared/database/prisma.service';
import { PERMISSIONS_KEY } from '@/shared/decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
    if (required.length === 0) return true;
    const request = context.switchToHttp().getRequest<{ user?: { sub?: string } }>();
    if (!request.user?.sub) throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Access denied' });
    const userId = request.user.sub;
    const assignments = await this.prisma.userRole.findMany({
      where: { userId, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    const granted = new Set(assignments.flatMap((a) => a.role.permissions.map((p) => p.permission.code)));
    if (required.every((permission) => granted.has(permission))) return true;

    // Otorisasi gagal. Bedakan dua sebab yang berbeda artinya bagi klien:
    // - Token menunjuk user yang tidak ada / non-aktif (mis. DB di-reset, user
    //   dihapus) → 401 SESSION_STALE: klien harus login ulang, bukan "tak
    //   berizin". Ini mencegah 403 menyesatkan pada sesi basi.
    // - User ada tetapi memang kurang izin → 403 PERMISSION_DENIED.
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({ code: 'SESSION_STALE', message: 'Your session is no longer valid. Please sign in again.' });
    }
    throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Access denied' });
  }
}
