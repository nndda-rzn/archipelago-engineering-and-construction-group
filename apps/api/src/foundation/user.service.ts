import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/audit/audit.service';
import type { CreateUserDto, ListUserQueryDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async findAll(query: ListUserQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const search = query.search;

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { displayName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          userRoles: { include: { role: { select: { code: true } } } },
        },
        orderBy: { username: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((user) => ({ ...user, roles: user.userRoles.map((r) => r.role.code) })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.email }] },
    });
    if (existing) {
      throw new ConflictException({ code: 'USER_EXISTS', message: 'Username atau email sudah digunakan' });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        displayName: dto.displayName,
        passwordHash,
        legalEntityId: dto.legalEntityId,
      },
    });

    if (dto.roleCode) {
      const role = await this.prisma.role.findUnique({ where: { code: dto.roleCode } });
      if (role) {
        await this.prisma.userRole.create({
          data: { userId: user.id, roleId: role.id, effectiveFrom: new Date() },
        });
      }
    }

    await this.audit.record({
      userId: actorId,
      action: 'USER.CREATE',
      resource: 'User',
      resourceId: user.id,
      newValue: { username: user.username, email: user.email, role: dto.roleCode },
      source: 'api',
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      roles: dto.roleCode ? [dto.roleCode] : [],
    };
  }

  async block(id: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User tidak ditemukan' });
    const blocked = await this.prisma.user.update({
      where: { id },
      data: { status: 'BLOCKED' },
      select: { id: true, username: true, status: true },
    });

    await this.audit.record({
      userId: actorId,
      action: 'USER.BLOCK',
      resource: 'User',
      resourceId: id,
      oldValue: { status: user.status },
      newValue: { status: 'BLOCKED' },
      source: 'api',
    });

    return blocked;
  }
}
