import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { buildTree, type TreeNode } from '@/shared/utils/tree.util';
import type { CreateWbsItemDto } from '../../presentation/dto/wbs.dto';

function unwrapTree<T extends { id: string; parentId: string | null }>(
  nodes: TreeNode<T>[],
): Array<T & { children: Array<T & { children: unknown[] }> }> {
  return nodes.map((n) => ({ ...n.item, children: unwrapTree(n.children) as Array<T & { children: unknown[] }> }));
}

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

    const tree = buildTree(items);
    return unwrapTree(tree);
  }

  async create(projectId: string, dto: CreateWbsItemDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    if (dto.parentId) {
      const parent = await this.prisma.wbsItem.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.projectId !== projectId) {
        throw new NotFoundException({ code: 'WBS_PARENT_NOT_FOUND', message: 'Parent WBS not found in this project' });
      }
    }

    const existing = await this.prisma.wbsItem.findUnique({
      where: { projectId_code: { projectId, code: dto.code } },
    });
    if (existing) throw new ConflictException({ code: 'WBS_EXISTS', message: 'WBS code already exists in this project' });

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
