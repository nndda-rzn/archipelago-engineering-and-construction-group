import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import type { AssignPermissionsDto, CreateRoleDto } from '../../presentation/dto/role.dto';

@Injectable()
export class RoleService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { userRoles: true } },
        permissions: {
          include: { permission: { select: { code: true, resource: true, action: true } } },
        },
      },
    });
  }

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException({ code: 'ROLE_EXISTS', message: 'Kode role sudah digunakan' });
    return this.prisma.role.create({ data: dto });
  }

  async assignPermissions(id: string, dto: AssignPermissionsDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role tidak ditemukan' });

    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: dto.permissionCodes } },
    });

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: id, permissionId: p.id, scopeType: 'GLOBAL', scopeValue: '' })),
      }),
    ]);

    return this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: { select: { code: true } } } } },
    });
  }
}
