import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from './audit.service';
import type {
  CreateUserDto, ListUserQueryDto, UpdateUserDto, SetUserStatusDto,
  AssignRoleDto, ResetPasswordDto, UpdateUserSettingsDto, InviteUserDto, AcceptInvitationDto,
} from '../../presentation/dto/user.dto';

/** Select bersama untuk daftar user (identitas kerja + relasi). */
const USER_SELECT = {
  id: true, username: true, email: true, displayName: true, status: true,
  lastLoginAt: true, createdAt: true, updatedAt: true,
  jobTitle: true, department: true, phone: true, managerId: true,
  legalEntityId: true, organizationId: true, blockedAt: true, blockedReason: true,
  passwordChangedAt: true, failedLoginCount: true, lastFailedLoginAt: true,
  legalEntity: { select: { code: true, legalName: true } },
  organization: { select: { name: true } },
  userRoles: {
    where: { OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
    include: { role: { select: { code: true, name: true, status: true } } },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class UserService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async findAll(query: ListUserQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const search = query.search?.trim();

    const where: Prisma.UserWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { displayName: { contains: search, mode: 'insensitive' } },
              { jobTitle: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.roleCode ? { userRoles: { some: { role: { code: query.roleCode }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] } } } : {}),
      ...(query.noRole === 'true' ? { userRoles: { none: {} } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, select: USER_SELECT, orderBy: { username: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.user.count({ where }),
    ]);

    const ids = items.map((u) => u.id);
    const sessions = ids.length
      ? await this.prisma.userSession.groupBy({ by: ['userId'], where: { userId: { in: ids }, status: 'ACTIVE' }, _count: { _all: true } })
      : [];
    const sessionCount = new Map(sessions.map((s) => [s.userId, s._count._all]));

    return {
      items: items.map((u) => this.toListItem(u, sessionCount.get(u.id) ?? 0)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** Ringkasan untuk KPI strip (bukan sekadar daftar). */
  async stats() {
    const [total, active, blocked, noRole, sessions, assignments, roles] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { status: { in: ['BLOCKED', 'SUSPENDED'] } } }),
      this.prisma.user.count({ where: { userRoles: { none: {} } } }),
      this.prisma.userSession.count({ where: { status: 'ACTIVE' } }),
      this.prisma.userRole.findMany({ where: { OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] }, select: { roleId: true } }),
      this.prisma.role.findMany({ select: { id: true, code: true, name: true } }),
    ]);
    const roleById = new Map(roles.map((r) => [r.id, r]));
    const counts = new Map<string, number>();
    for (const a of assignments) counts.set(a.roleId, (counts.get(a.roleId) ?? 0) + 1);
    const byRole = [...counts.entries()]
      .map(([roleId, count]) => ({ code: roleById.get(roleId)?.code ?? roleId, name: roleById.get(roleId)?.name ?? '', count }))
      .sort((a, b) => b.count - a.count);
    return { total, active, blocked, noRole, activeSessions: sessions, byRole };
  }

  /** Profil lengkap: identitas + peran + permission efektif + sesi + login terakhir. */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { ...USER_SELECT, employee: { select: { employeeNumber: true, position: true, department: true, grade: true } } },
    });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });

    const [sessions, recentLogins, activity, permissions] = await this.prisma.$transaction([
      this.prisma.userSession.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.loginEvent.findMany({ where: { userId: id }, orderBy: { at: 'desc' }, take: 20 }),
      this.prisma.userActivity.findMany({ where: { userId: id }, orderBy: { at: 'desc' }, take: 30 }),
      this.prisma.rolePermission.findMany({
        where: { role: { userRoles: { some: { userId: id, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] } } } },
        select: { permission: { select: { code: true, resource: true, action: true } } },
      }),
    ]);

    const permSet = new Map(permissions.map((p) => [p.permission.code, p.permission]));
    return {
      user,
      roles: user.userRoles.map((ur) => ({ code: ur.role.code, name: ur.role.name, status: ur.role.status, effectiveFrom: ur.effectiveFrom, effectiveTo: ur.effectiveTo })),
      permissions: [...permSet.values()].sort((a, b) => a.code.localeCompare(b.code)),
      sessions,
      recentLogins,
      activity,
    };
  }

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findFirst({ where: { OR: [{ username: dto.username }, { email: dto.email }] } });
    if (existing) throw new ConflictException({ code: 'USER_EXISTS', message: 'Username or email is already in use' });

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const role = dto.roleCode ? await this.prisma.role.findUnique({ where: { code: dto.roleCode } }) : null;

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: dto.username, email: dto.email, displayName: dto.displayName, passwordHash,
          legalEntityId: dto.legalEntityId, organizationId: dto.organizationId,
          jobTitle: dto.jobTitle, department: dto.department, phone: dto.phone, managerId: dto.managerId,
          createdById: actorId,
        },
      });
      await tx.userSetting.create({ data: { userId: created.id } });
      if (role) await tx.userRole.create({ data: { userId: created.id, roleId: role.id, effectiveFrom: new Date(), assignedById: actorId } });
      return created;
    });

    await this.audit.record({ userId: actorId, action: 'USER.CREATE', resource: 'User', resourceId: user.id, newValue: { username: user.username, email: user.email, role: dto.roleCode }, source: 'api' });
    return { id: user.id, username: user.username, email: user.email, displayName: user.displayName, status: user.status, roles: dto.roleCode ? [dto.roleCode] : [] };
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const before = await this.prisma.user.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });

    if (dto.email && dto.email !== before.email) {
      const clash = await this.prisma.user.findFirst({ where: { email: dto.email, NOT: { id } } });
      if (clash) throw new ConflictException({ code: 'USER_EXISTS', message: 'Email is already in use' });
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.legalEntityId !== undefined ? { legalEntityId: dto.legalEntityId || null } : {}),
        ...(dto.organizationId !== undefined ? { organizationId: dto.organizationId || null } : {}),
        ...(dto.jobTitle !== undefined ? { jobTitle: dto.jobTitle || null } : {}),
        ...(dto.department !== undefined ? { department: dto.department || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
        ...(dto.managerId !== undefined ? { managerId: dto.managerId || null } : {}),
        updatedById: actorId,
      },
    });
    await this.audit.record({ userId: actorId, action: 'USER.UPDATE', resource: 'User', resourceId: id, oldValue: { displayName: before.displayName, email: before.email }, newValue: { displayName: user.displayName, email: user.email }, source: 'api' });
    await this.recordActivity(id, actorId, 'PROFILE_UPDATED', `Profile updated by ${actorId}`);
    return user;
  }

  /** Ubah status. Block/Suspend → cabut sesi aktif; Active → bersihkan field block. */
  async setStatus(id: string, dto: SetUserStatusDto, actorId: string) {
    const before = await this.prisma.user.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });

    const blocking = dto.status === 'BLOCKED' || dto.status === 'SUSPENDED' || dto.status === 'INACTIVE';
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        status: dto.status,
        ...(blocking ? { blockedAt: new Date(), blockedReason: dto.reason ?? null } : { blockedAt: null, blockedReason: null, failedLoginCount: 0 }),
        updatedById: actorId,
      },
    });
    if (blocking) {
      await this.prisma.userSession.updateMany({ where: { userId: id, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: new Date(), revokedById: actorId } });
    }
    await this.audit.record({ userId: actorId, action: 'USER.STATUS', resource: 'User', resourceId: id, oldValue: { status: before.status }, newValue: { status: dto.status, reason: dto.reason }, source: 'api' });
    await this.recordActivity(id, actorId, 'STATUS_CHANGED', `Status ${before.status} → ${dto.status}`);
    return user;
  }

  async assignRole(id: string, dto: AssignRoleDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    const role = await this.prisma.role.findUnique({ where: { code: dto.roleCode } });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: `Role not found: ${dto.roleCode}` });

    const existing = await this.prisma.userRole.findFirst({ where: { userId: id, roleId: role.id, effectiveTo: null } });
    if (existing) throw new ConflictException({ code: 'ROLE_ALREADY_ASSIGNED', message: `User already has role ${dto.roleCode}` });

    await this.prisma.userRole.create({ data: { userId: id, roleId: role.id, effectiveFrom: new Date(), assignedById: actorId, reason: dto.reason ?? null } });
    await this.audit.record({ userId: actorId, action: 'USER.ROLE_ASSIGN', resource: 'User', resourceId: id, newValue: { role: dto.roleCode, reason: dto.reason }, source: 'api' });
    await this.recordActivity(id, actorId, 'ROLE_ASSIGNED', `Role ${role.name} assigned`);
    return { id, role: role.code };
  }

  async revokeRole(id: string, roleCode: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: `Role not found: ${roleCode}` });

    const res = await this.prisma.userRole.updateMany({ where: { userId: id, roleId: role.id, effectiveTo: null }, data: { effectiveTo: new Date() } });
    await this.audit.record({ userId: actorId, action: 'USER.ROLE_REVOKE', resource: 'User', resourceId: id, oldValue: { role: roleCode }, source: 'api' });
    await this.recordActivity(id, actorId, 'ROLE_REVOKED', `Role ${role.name} revoked`);
    return { id, role: role.code, revoked: res.count };
  }

  /** Reset password oleh admin — mencabut semua sesi (paksa login ulang). */
  async resetPassword(id: string, dto: ResetPasswordDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    const tempPassword = dto.password ?? `Tmp${randomBytes(4).toString('hex')}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, updatedById: actorId } });
    await this.prisma.userSession.updateMany({ where: { userId: id, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: new Date(), revokedById: actorId } });
    await this.audit.record({ userId: actorId, action: 'USER.RESET_PASSWORD', resource: 'User', resourceId: id, source: 'api' });
    await this.recordActivity(id, actorId, 'PASSWORD_RESET', 'Password reset by administrator');
    return { id, temporaryPassword: tempPassword };
  }

  async listSessions(id: string) {
    return this.prisma.userSession.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } });
  }

  async revokeSession(userId: string, sessionId: string, actorId: string) {
    const res = await this.prisma.userSession.updateMany({ where: { id: sessionId, userId, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: new Date(), revokedById: actorId } });
    await this.audit.record({ userId: actorId, action: 'USER.SESSION_REVOKE', resource: 'UserSession', resourceId: sessionId, source: 'api' });
    return { revoked: res.count };
  }

  async forceLogout(id: string, actorId: string) {
    const res = await this.prisma.userSession.updateMany({ where: { userId: id, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: new Date(), revokedById: actorId } });
    await this.audit.record({ userId: actorId, action: 'USER.FORCE_LOGOUT', resource: 'User', resourceId: id, source: 'api' });
    return { revoked: res.count };
  }

  async getSettings(id: string) {
    return this.prisma.userSetting.upsert({ where: { userId: id }, update: {}, create: { userId: id } });
  }

  async updateSettings(id: string, dto: UpdateUserSettingsDto) {
    return this.prisma.userSetting.upsert({
      where: { userId: id },
      update: { ...dto },
      create: { userId: id, ...dto },
    });
  }

  async activity(id: string) {
    return this.prisma.userActivity.findMany({ where: { userId: id }, orderBy: { at: 'desc' }, take: 50 });
  }

  /** Undang user baru — membuat entri INVITED + token (mengembalikan token sekali). */
  async invite(dto: InviteUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException({ code: 'USER_EXISTS', message: 'Email is already in use' });
    const token = randomBytes(24).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const invitation = await this.prisma.userInvitation.create({
      data: {
        email: dto.email, username: dto.username, roleCodes: dto.roleCodes ?? [], invitedById: actorId,
        legalEntityId: dto.legalEntityId, tokenHash, expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    await this.audit.record({ userId: actorId, action: 'USER.INVITE', resource: 'UserInvitation', resourceId: invitation.id, newValue: { email: dto.email, roles: dto.roleCodes }, source: 'api' });
    return { id: invitation.id, email: invitation.email, expiresAt: invitation.expiresAt, token };
  }

  /** Terima undangan — membuat user ACTIVE + assign role dari undangan. */
  async acceptInvitation(dto: AcceptInvitationDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const invitation = await this.prisma.userInvitation.findFirst({ where: { tokenHash, status: 'PENDING' } });
    if (!invitation || invitation.expiresAt < new Date()) {
      throw new NotFoundException({ code: 'INVITATION_INVALID', message: 'Invitation is invalid or expired' });
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: dto.username, email: invitation.email, displayName: dto.displayName, passwordHash,
          legalEntityId: invitation.legalEntityId, status: 'ACTIVE', passwordChangedAt: new Date(),
        },
      });
      await tx.userSetting.create({ data: { userId: created.id } });
      for (const code of invitation.roleCodes) {
        const role = await tx.role.findUnique({ where: { code } });
        if (role) await tx.userRole.create({ data: { userId: created.id, roleId: role.id, effectiveFrom: new Date(), assignedById: invitation.invitedById } });
      }
      await tx.userInvitation.update({ where: { id: invitation.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
      return created;
    });
    await this.audit.record({ userId: user.id, action: 'USER.INVITE_ACCEPT', resource: 'User', resourceId: user.id, source: 'api' });
    return { id: user.id, username: user.username, email: user.email };
  }

  private toListItem(u: Prisma.UserGetPayload<{ select: typeof USER_SELECT }>, activeSessions: number) {
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      displayName: u.displayName,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      jobTitle: u.jobTitle,
      department: u.department,
      phone: u.phone,
      managerId: u.managerId,
      legalEntityId: u.legalEntityId,
      organizationId: u.organizationId,
      blockedAt: u.blockedAt,
      blockedReason: u.blockedReason,
      legalEntityCode: u.legalEntity?.code ?? null,
      legalEntityName: u.legalEntity?.legalName ?? null,
      organizationName: u.organization?.name ?? null,
      roles: u.userRoles.map((ur) => ur.role.code),
      roleDetails: u.userRoles.map((ur) => ({ code: ur.role.code, name: ur.role.name, effectiveFrom: ur.effectiveFrom, effectiveTo: ur.effectiveTo })),
      activeSessions,
    };
  }

  private async recordActivity(userId: string, actorId: string | null, action: string, summary: string) {
    await this.prisma.userActivity.create({ data: { userId, actorId, action, summary } });
  }
}
