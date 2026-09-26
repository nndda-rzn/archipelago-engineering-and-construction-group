import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation/application/services/audit.service';
import { buildTree } from '@/shared/utils/tree.util';
import type { CreateOrganizationDto } from '../../presentation/dto/foundation-hardening.dto';

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
