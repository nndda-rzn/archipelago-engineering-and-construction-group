import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation/application/services/audit.service';
import { buildTree } from '@/shared/utils/tree.util';
import type { CreateOrganizationDto, UpdateOrganizationDto } from '../../presentation/dto/foundation-hardening.dto';

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createOrganization(dto: CreateOrganizationDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity not found' });

    if (dto.parentId) {
      const parent = await this.prisma.organization.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException({ code: 'PARENT_NOT_FOUND', message: 'Parent organization not found' });
    }

    const org = await this.prisma.organization.create({
      data: {
        legalEntityId: dto.legalEntityId,
        name: dto.name,
        orgType: dto.orgType,
        parentId: dto.parentId ?? null,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
    });

    await this.audit.record({ userId: actorId, action: 'Organization.CREATE', resource: 'Organization', resourceId: org.id, newValue: { name: dto.name, orgType: dto.orgType }, source: 'api' });
    return org;
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException({ code: 'ORG_NOT_FOUND', message: 'Organization not found' });
    return org;
  }

  /**
   * Ubah unit organisasi. Bila `parentId` diubah, tolak siklus: parent baru
   * tidak boleh merupakan keturunan unit ini sendiri (kalau tidak, tree akan
   * berputar tanpa ujung).
   */
  async updateOrganization(id: string, dto: UpdateOrganizationDto, actorId: string) {
    const before = await this.findOne(id);

    if (dto.parentId) {
      const siblings = await this.prisma.organization.findMany({ where: { legalEntityId: before.legalEntityId }, select: { id: true, parentId: true } });
      const parentById = new Map(siblings.map((o) => [o.id, o.parentId]));
      let cursor: string | null = dto.parentId;
      const seen = new Set<string>();
      while (cursor) {
        if (cursor === id) throw new BadRequestException({ code: 'ORG_CYCLE', message: 'An organization cannot be its own ancestor' });
        if (seen.has(cursor)) break; // data lama sudah siklik — berhenti, jangan loop tanpa ujung
        seen.add(cursor);
        cursor = parentById.get(cursor) ?? null;
      }
    }

    const org = await this.prisma.organization.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.orgType !== undefined ? { orgType: dto.orgType } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId || null } : {}),
        ...(dto.effectiveFrom !== undefined ? { effectiveFrom: new Date(dto.effectiveFrom) } : {}),
        ...(dto.effectiveTo !== undefined ? { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null } : {}),
      },
    });

    await this.audit.record({
      userId: actorId, action: 'Organization.UPDATE', resource: 'Organization', resourceId: id,
      oldValue: { name: before.name, orgType: before.orgType, parentId: before.parentId },
      newValue: { name: org.name, orgType: org.orgType, parentId: org.parentId },
      source: 'api',
    });
    return org;
  }

  /** Aktif/nonaktif unit — compare-and-set, transisi no-op ditolak. */
  async setStatus(id: string, status: 'ACTIVE' | 'INACTIVE', actorId: string) {
    const before = await this.findOne(id);
    const { count } = await this.prisma.organization.updateMany({ where: { id, status: { not: status } }, data: { status } });
    if (count === 0) throw new ConflictException({ code: 'INVALID_STATUS_TRANSITION', message: `Organization is already ${status}` });
    await this.audit.record({
      userId: actorId, action: 'Organization.STATUS', resource: 'Organization', resourceId: id,
      oldValue: { status: before.status }, newValue: { status }, source: 'api',
    });
    return this.findOne(id);
  }

  async listOrganizations(legalEntityId: string, asOf?: string) {
    const asOfDate = asOf ? new Date(asOf) : new Date();
    const orgs = await this.prisma.organization.findMany({
      where: {
        legalEntityId,
        effectiveFrom: { lte: asOfDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOfDate } }],
      },
      orderBy: { name: 'asc' },
    });

    const tree = buildTree(orgs);
    return { legalEntityId, asOf: asOfDate.toISOString(), total: orgs.length, roots: tree };
  }
}
