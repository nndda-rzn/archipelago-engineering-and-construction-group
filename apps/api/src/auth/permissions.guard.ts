import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/shared/database/prisma.service';
import { PERMISSIONS_KEY } from './permissions.decorator';

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
    if (!request.user?.sub) throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Akses ditolak' });
    const assignments = await this.prisma.userRole.findMany({
      where: { userId: request.user.sub, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    const granted = new Set(assignments.flatMap((a) => a.role.permissions.map((p) => p.permission.code)));
    if (!required.every((permission) => granted.has(permission))) {
      throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Akses ditolak' });
    }
    return true;
  }
}
