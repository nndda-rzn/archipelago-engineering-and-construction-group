import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { LegalEntityUsage } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from './audit.service';
import type { CreateLegalEntityDto } from '../../presentation/dto/create-legal-entity.dto';
import type { UpdateLegalEntityDto } from '../../presentation/dto/update-legal-entity.dto';
import type { ListLegalEntityQueryDto } from '../../presentation/dto/list-legal-entity-query.dto';

@Injectable()
export class LegalEntityService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /**
   * Ringkasan penggunaan lintas domain: berapa banyak record yang menunjuk ke
   * entity ini. Satu `$transaction` paralel (bukan N+1) supaya mahal tidak
   * tumbuh seiring jumlah relasi. Nol berarti "tidak dipakai" — dilaporkan
   * apa adanya, bukan disembunyikan.
   */
  async usage(id: string): Promise<LegalEntityUsage> {
    await this.findOne(id);
    const [projects, users, organizations, chartOfAccounts, bankAccounts, periodCloses, employees, equipment] =
      await this.prisma.$transaction([
        this.prisma.project.count({ where: { legalEntityId: id } }),
        this.prisma.user.count({ where: { legalEntityId: id } }),
        this.prisma.organization.count({ where: { legalEntityId: id } }),
        this.prisma.chartOfAccount.count({ where: { legalEntityId: id } }),
        this.prisma.bankAccount.count({ where: { legalEntityId: id } }),
        this.prisma.periodClose.count({ where: { legalEntityId: id } }),
        this.prisma.employee.count({ where: { legalEntityId: id } }),
        this.prisma.equipment.count({ where: { legalEntityId: id } }),
      ]);
    return { projects, users, organizations, chartOfAccounts, bankAccounts, periodCloses, employees, equipment, generatedAt: new Date().toISOString() };
  }

  async findAll(query: ListLegalEntityQueryDto) {

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
    if (!entity) throw new NotFoundException({ code: 'LEGAL_ENTITY_NOT_FOUND', message: 'Legal entity not found' });
    return entity;
  }

  async create(dto: CreateLegalEntityDto, actorId: string) {
    try {
      const entity = await this.prisma.legalEntity.create({ data: dto });
      await this.audit.record({
        userId: actorId, action: 'LEGAL_ENTITY.CREATE', resource: 'LegalEntity', resourceId: entity.id,
        newValue: { code: entity.code, legalName: entity.legalName }, source: 'api',
      });
      return entity;
    } catch (error) {
      if (this.isUniqueError(error)) {
        throw new ConflictException({ code: 'LEGAL_ENTITY_EXISTS', message: 'Code or tax identifier is already in use' });
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateLegalEntityDto, actorId: string) {
    const before = await this.findOne(id);
    try {
      const entity = await this.prisma.legalEntity.update({ where: { id }, data: dto });
      await this.audit.record({
        userId: actorId, action: 'LEGAL_ENTITY.UPDATE', resource: 'LegalEntity', resourceId: id,
        oldValue: { legalName: before.legalName, functionalCurrency: before.functionalCurrency, reportingCurrency: before.reportingCurrency, fiscalCalendar: before.fiscalCalendar },
        newValue: { legalName: entity.legalName, functionalCurrency: entity.functionalCurrency, reportingCurrency: entity.reportingCurrency, fiscalCalendar: entity.fiscalCalendar },
        source: 'api',
      });
      return entity;
    } catch (error) {
      if (this.isUniqueError(error)) {
        throw new ConflictException({ code: 'LEGAL_ENTITY_EXISTS', message: 'Code or tax identifier is already in use' });
      }
      throw error;
    }
  }

  /**
   * Blokir entity — compare-and-set. Klik ganda tidak menghasilkan transisi
   * kedua (count 0) sehingga tidak ada audit ganda. Respons menyertakan `usage`
   * supaya UI bisa menunjukkan dampaknya.
   */
  async block(id: string, actorId: string) {
    const before = await this.findOne(id);
    const { count } = await this.prisma.legalEntity.updateMany({
      where: { id, status: { not: 'BLOCKED' } },
      data: { status: 'BLOCKED' },
    });
    if (count > 0) {
      await this.audit.record({
        userId: actorId, action: 'LEGAL_ENTITY.BLOCK', resource: 'LegalEntity', resourceId: id,
        oldValue: { status: before.status }, newValue: { status: 'BLOCKED' }, source: 'api',
      });
    }
    const entity = await this.prisma.legalEntity.findFirst({ where: { id } });
    return { ...entity, usage: await this.usage(id) };
  }

  /** Aktifkan kembali entity yang sedang BLOCKED — compare-and-set simetris. */
  async unblock(id: string, actorId: string) {
    const before = await this.findOne(id);
    if (before.status !== 'BLOCKED') {
      throw new ConflictException({ code: 'INVALID_STATUS_TRANSITION', message: 'Only a BLOCKED entity can be activated' });
    }
    const { count } = await this.prisma.legalEntity.updateMany({
      where: { id, status: 'BLOCKED' },
      data: { status: 'ACTIVE' },
    });
    if (count > 0) {
      await this.audit.record({
        userId: actorId, action: 'LEGAL_ENTITY.UNBLOCK', resource: 'LegalEntity', resourceId: id,
        oldValue: { status: 'BLOCKED' }, newValue: { status: 'ACTIVE' }, source: 'api',
      });
    }
    const entity = await this.prisma.legalEntity.findFirst({ where: { id } });
    return { ...entity, usage: await this.usage(id) };
  }

  private isUniqueError(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
