import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from './audit.service';
import type { AddRoleMemberDto, AssignPermissionsDto, CreateRoleDto, UpdateRoleDto } from '../../presentation/dto/role.dto';

/** Select bersama untuk daftar/detail role. */
const ROLE_SELECT = {
  id: true, code: true, name: true, description: true, status: true, category: true,
  isSystem: true, isAssignable: true, createdAt: true, updatedAt: true,
  permissions: { include: { permission: { select: { code: true, resource: true, action: true, group: true, isSensitive: true } } } },
  _count: { select: { userRoles: true } },
} satisfies Prisma.RoleSelect;

@Injectable()
export class RoleService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({ orderBy: { code: 'asc' }, select: ROLE_SELECT });
    return roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      status: r.status,
      category: r.category,
      isSystem: r.isSystem,
      isAssignable: r.isAssignable,
      memberCount: r._count.userRoles,
      permissionCount: r.permissions.length,
      permissions: r.permissions.map((rp) => rp.permission),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  /** KPI strip: total, aktif, role kosong (0 izin), role tak terpakai (0 anggota). */
  async stats() {
    const [total, active, roles, assignments] = await this.prisma.$transaction([
      this.prisma.role.count(),
      this.prisma.role.count({ where: { status: 'ACTIVE' } }),
      this.prisma.role.findMany({ select: { id: true, permissions: { select: { permissionId: true } }, _count: { select: { userRoles: true } } } }),
      this.prisma.rolePermission.count(),
    ]);
    const emptyRoles = roles.filter((r) => r.permissions.length === 0).length;
    const unusedRoles = roles.filter((r) => r._count.userRoles === 0).length;
    return { total, active, emptyRoles, unusedRoles, assignments };
  }

  /** Detail: role + izin + anggota (siapa) + timeline aktivitas. */
  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      select: {
        ...ROLE_SELECT,
        userRoles: {
          where: { OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
          select: {
            effectiveFrom: true, effectiveTo: true, assignedById: true, reason: true,
            user: { select: { id: true, displayName: true, email: true, jobTitle: true, department: true, legalEntity: { select: { code: true, legalName: true } } } },
          },
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' });

    const activity = await this.prisma.roleActivity.findMany({ where: { roleId: id }, orderBy: { at: 'desc' }, take: 50 });

    return {
      role: {
        id: role.id, code: role.code, name: role.name, description: role.description, status: role.status,
        category: role.category, isSystem: role.isSystem, isAssignable: role.isAssignable,
        createdAt: role.createdAt, updatedAt: role.updatedAt,
      },
      permissions: role.permissions.map((rp) => rp.permission).sort((a, b) => a.code.localeCompare(b.code)),
      members: role.userRoles.map((ur) => ({
        userId: ur.user.id, displayName: ur.user.displayName, email: ur.user.email,
        jobTitle: ur.user.jobTitle, department: ur.user.department,
        legalEntityCode: ur.user.legalEntity?.code ?? null, legalEntityName: ur.user.legalEntity?.legalName ?? null,
        effectiveFrom: ur.effectiveFrom, effectiveTo: ur.effectiveTo, assignedById: ur.assignedById, reason: ur.reason,
      })),
      activity,
    };
  }

  async create(dto: CreateRoleDto, actorId: string) {
    const existing = await this.prisma.role.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException({ code: 'ROLE_EXISTS', message: 'Role code is already in use' });
    const role = await this.prisma.role.create({
      data: { code: dto.code, name: dto.name, description: dto.description ?? null, category: dto.category ?? 'CUSTOM', status: dto.status ?? 'ACTIVE', isAssignable: dto.isAssignable ?? true, createdById: actorId, updatedById: actorId },
    });
    await this.audit.record({ userId: actorId, action: 'ROLE.CREATE', resource: 'Role', resourceId: role.id, newValue: { code: role.code, name: role.name }, source: 'api' });
    await this.recordActivity(role.id, actorId, 'ROLE.CREATE', `Role ${role.name} created`);
    return role;
  }

  async update(id: string, dto: UpdateRoleDto, actorId: string) {
    const before = await this.prisma.role.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' });
    const role = await this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description || null } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.isAssignable !== undefined ? { isAssignable: dto.isAssignable } : {}),
        updatedById: actorId,
      },
    });
    await this.audit.record({ userId: actorId, action: 'ROLE.UPDATE', resource: 'Role', resourceId: id, oldValue: { name: before.name, status: before.status }, newValue: { name: role.name, status: role.status }, source: 'api' });
    await this.recordActivity(id, actorId, 'ROLE.UPDATE', `Role ${role.name} updated`);
    return role;
  }

  async setStatus(id: string, status: 'ACTIVE' | 'INACTIVE', actorId: string) {
    const before = await this.prisma.role.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' });
    const role = await this.prisma.role.update({ where: { id }, data: { status, updatedById: actorId } });
    await this.audit.record({ userId: actorId, action: 'ROLE.STATUS', resource: 'Role', resourceId: id, oldValue: { status: before.status }, newValue: { status }, source: 'api' });
    await this.recordActivity(id, actorId, 'ROLE.STATUS', `Status ${before.status} → ${status}`);
    return role;
  }

  /** Hapus role — ditolak untuk role sistem atau role yang masih punya anggota aktif. */
  async remove(id: string, actorId: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' });
    if (role.isSystem) throw new ConflictException({ code: 'ROLE_SYSTEM', message: 'System roles cannot be deleted' });

    // Hanya anggota AKTIF yang menghalangi penghapusan — keanggotaan yang sudah
    // dicabut (effectiveTo terisi) tetap tersimpan sebagai riwayat dan tidak boleh
    // membuat role terkunci selamanya.
    const activeMembers = await this.prisma.userRole.count({ where: { roleId: id, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] } });
    if (activeMembers > 0) throw new ConflictException({ code: 'ROLE_IN_USE', message: `Role still has ${activeMembers} active member(s)` });

    await this.prisma.role.delete({ where: { id } });
    await this.audit.record({ userId: actorId, action: 'ROLE.DELETE', resource: 'Role', resourceId: id, oldValue: { code: role.code, name: role.name }, source: 'api' });
    return { id, deleted: true };
  }

  /**
   * Ganti seluruh izin role (diff-based) — mengembalikan izin yang ditambah &
   * dihapus agar UI bisa menampilkan ringkasan perubahan.
   */
  async assignPermissions(id: string, dto: AssignPermissionsDto, actorId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: { select: { code: true } } } } },
    });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' });

    const before = new Set(role.permissions.map((rp) => rp.permission.code));
    const target = new Set(dto.permissionCodes);
    const added = [...target].filter((c) => !before.has(c));
    const removed = [...before].filter((c) => !target.has(c));

    const permissions = await this.prisma.permission.findMany({ where: { code: { in: dto.permissionCodes } } });
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({ roleId: id, permissionId: p.id, scopeType: 'GLOBAL' as const, scopeValue: '', grantedById: actorId })),
        });
      }
    });

    await this.audit.record({ userId: actorId, action: 'ROLE.PERMISSIONS_CHANGE', resource: 'Role', resourceId: id, oldValue: { added: added, removed: removed }, newValue: { permissionCount: permissions.length }, source: 'api' });
    await this.recordActivity(id, actorId, 'ROLE.PERMISSIONS_CHANGE', `Permissions updated (+${added.length} / -${removed.length})`, { added, removed });
    return { id, added, removed, permissionCount: permissions.length };
  }

  /** Tambah anggota (assign role ke user). */
  async addMember(id: string, dto: AddRoleMemberDto, actorId: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' });
    if (!role.isAssignable) throw new ConflictException({ code: 'ROLE_NOT_ASSIGNABLE', message: 'This role cannot be assigned' });
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });

    const existing = await this.prisma.userRole.findFirst({ where: { userId: dto.userId, roleId: id, effectiveTo: null } });
    if (existing) throw new ConflictException({ code: 'MEMBER_EXISTS', message: `${user.displayName} already has this role` });

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();
    await this.prisma.userRole.create({ data: { userId: dto.userId, roleId: id, effectiveFrom, assignedById: actorId, reason: dto.reason ?? null } });
    await this.audit.record({ userId: actorId, action: 'ROLE.MEMBER_ADD', resource: 'Role', resourceId: id, newValue: { userId: dto.userId, role: role.code, reason: dto.reason }, source: 'api' });
    await this.recordActivity(id, actorId, 'ROLE.MEMBER_ADD', `${user.displayName} added to ${role.name}`);
    return { id, userId: dto.userId };
  }

  /** Cabut anggota (set effectiveTo). */
  async removeMember(id: string, userId: string, actorId: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const res = await this.prisma.userRole.updateMany({ where: { userId, roleId: id, effectiveTo: null }, data: { effectiveTo: new Date() } });
    await this.audit.record({ userId: actorId, action: 'ROLE.MEMBER_REMOVE', resource: 'Role', resourceId: id, oldValue: { userId, role: role.code }, source: 'api' });
    await this.recordActivity(id, actorId, 'ROLE.MEMBER_REMOVE', `${user?.displayName ?? userId} removed from ${role.name}`);
    return { id, userId, revoked: res.count };
  }

  /** Katalog seluruh izin (untuk matriks) — dikelompokkan, diurutkan. */
  async listPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ group: 'asc' }, { resource: 'asc' }, { action: 'asc' }],
      select: { code: true, resource: true, action: true, description: true, group: true, isSensitive: true, sortOrder: true },
    });
    return permissions;
  }

  private async recordActivity(roleId: string, actorId: string | null, action: string, summary: string, metadata?: Prisma.InputJsonValue) {
    await this.prisma.roleActivity.create({ data: { roleId, actorId, action, summary, ...(metadata !== undefined ? { metadata } : {}) } });
  }
}
