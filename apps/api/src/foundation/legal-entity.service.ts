import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import type { CreateLegalEntityDto } from './dto/create-legal-entity.dto';
import type { UpdateLegalEntityDto } from './dto/update-legal-entity.dto';
import type { ListLegalEntityQueryDto } from './dto/list-legal-entity-query.dto';

@Injectable()
export class LegalEntityService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(query: ListLegalEntityQueryDto) {
    // Default + coerce eksplisit: runtime tsx tidak emit decorator metadata,
    // jadi class-transformer @Type/@IsInt tidak jalan — pageSize datang string.
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const sortBy = query.sortBy;
    const sortDir = query.sortDir ?? 'asc';
    const search = query.search;

    const where: Prisma.LegalEntityWhereInput = search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { legalName: { contains: search, mode: 'insensitive' } },
            { taxIdentifier: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.legalEntity.findMany({
        where,
        orderBy: sortBy ? { [sortBy]: sortDir } : { code: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.legalEntity.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id } });
    if (!entity) throw new NotFoundException({ code: 'LEGAL_ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });
    return entity;
  }

  async create(dto: CreateLegalEntityDto) {
    try {
      return await this.prisma.legalEntity.create({ data: dto });
    } catch (error) {
      if (this.isUniqueError(error)) {
        throw new ConflictException({ code: 'LEGAL_ENTITY_EXISTS', message: 'Code atau tax identifier sudah digunakan' });
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateLegalEntityDto) {
    await this.findOne(id);
    try {
      return await this.prisma.legalEntity.update({ where: { id }, data: dto });
    } catch (error) {
      if (this.isUniqueError(error)) {
        throw new ConflictException({ code: 'LEGAL_ENTITY_EXISTS', message: 'Code atau tax identifier sudah digunakan' });
      }
      throw error;
    }
  }

  async block(id: string) {
    await this.findOne(id);
    return this.prisma.legalEntity.update({ where: { id }, data: { status: 'BLOCKED' } });
  }

  private isUniqueError(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
