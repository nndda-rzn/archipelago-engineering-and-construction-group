import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import type { CreateLegalEntityDto } from './dto/create-legal-entity.dto';
import type { UpdateLegalEntityDto } from './dto/update-legal-entity.dto';

@Injectable()
export class LegalEntityService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.legalEntity.findMany({ orderBy: { code: 'asc' } });
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
