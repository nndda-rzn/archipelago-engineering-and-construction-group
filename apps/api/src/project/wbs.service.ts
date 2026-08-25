import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/audit/audit.service';
import type { CreateWbsItemDto } from './dto/wbs.dto';

export type WbsTreeNode = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  children: WbsTreeNode[];
};

@Injectable()
export class WbsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async getTree(projectId: string) {
    const items = await this.prisma.wbsItem.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });

    const map = new Map<string, WbsTreeNode>();
    const roots: WbsTreeNode[] = [];

    for (const item of items) {
      map.set(item.id, {
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        sortOrder: item.sortOrder,
        children: [],
      });
    }

    for (const item of items) {
      const node = map.get(item.id)!;
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async create(projectId: string, dto: CreateWbsItemDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    if (dto.parentId) {
      const parent = await this.prisma.wbsItem.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.projectId !== projectId) {
        throw new NotFoundException({ code: 'WBS_PARENT_NOT_FOUND', message: 'Parent WBS tidak ditemukan di project ini' });
      }
    }

    const existing = await this.prisma.wbsItem.findUnique({
      where: { projectId_code: { projectId, code: dto.code } },
    });
    if (existing) throw new ConflictException({ code: 'WBS_EXISTS', message: 'Kode WBS sudah ada di project ini' });

    const item = await this.prisma.wbsItem.create({
      data: {
        projectId,
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        parentId: dto.parentId ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'WBS.CREATE',
      resource: 'WbsItem',
      resourceId: item.id,
      newValue: { projectId, code: item.code, parentId: item.parentId },
      source: 'api',
    });

    return item;
  }
}
