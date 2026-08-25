import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { GlHelper } from './shared/gl.helper';
import type { CreateClientInvoiceDto, ListClientInvoiceQueryDto } from '../dto/finance.dto';

@Injectable()
export class ClientInvoiceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(GlHelper) private readonly gl: GlHelper,
  ) {}

  async createClientInvoice(dto: CreateClientInvoiceDto, actorId: string) {
    const claim = await this.prisma.progressClaim.findUnique({
      where: { id: dto.claimId },
      include: { project: { select: { legalEntityId: true, client: true } } },
    });
    if (!claim) throw new NotFoundException({ code: 'CLAIM_NOT_FOUND', message: 'Claim tidak ditemukan' });
    if (claim.status !== 'CERTIFIED') {
      throw new ConflictException({ code: 'CLAIM_NOT_CERTIFIED', message: 'Hanya claim CERTIFIED yang bisa di-invoice' });
    }

    const existing = await this.prisma.clientInvoice.findUnique({ where: { claimId: claim.id } });
    if (existing) throw new ConflictException({ code: 'CLAIM_ALREADY_INVOICED', message: 'Claim sudah punya client invoice' });

    const amount = Number(claim.certifiedAmount ?? claim.amount);
    const tax = Number(dto.taxAmount ?? 0);
    const total = amount + tax;

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'CINV' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'CINV', prefix: `CINV-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const invoice = await this.prisma.clientInvoice.create({
      data: {
        invoiceNumber: seq,
        projectId: claim.projectId,
        claimId: claim.id,
        client: claim.project.client,
        invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
        amount,
        taxAmount: tax > 0 ? tax : null,
        totalAmount: total,
        remark: dto.remark ?? null,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'ClientInvoice.CREATE',
      resource: 'ClientInvoice',
      resourceId: invoice.id,
      newValue: { invoiceNumber: seq, amount, taxAmount: tax, totalAmount: total, claimNumber: claim.claimNumber },
      source: 'api',
    });

    return invoice;
  }

  async postClientInvoice(id: string, actorId: string) {
    const invoice = await this.prisma.clientInvoice.findUnique({
      where: { id },
      include: { project: { select: { legalEntityId: true } } },
    });
    if (!invoice) throw new NotFoundException({ code: 'CLIENT_INVOICE_NOT_FOUND', message: 'Client invoice tidak ditemukan' });
    if (invoice.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa diposting (${invoice.status})` });
    }

    const posted = await this.prisma.clientInvoice.update({
      where: { id },
      data: { status: 'POSTED', postedAt: new Date(), postedBy: actorId },
    });

    await this.audit.record({
      userId: actorId,
      action: 'ClientInvoice.POST',
      resource: 'ClientInvoice',
      resourceId: id,
      newValue: { invoiceNumber: invoice.invoiceNumber, totalAmount: Number(invoice.totalAmount) },
      source: 'api',
    });

    await this.gl.postClientInvoiceJournal(
      {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        legalEntityId: invoice.project.legalEntityId,
        amount: Number(invoice.amount),
        taxAmount: invoice.taxAmount != null ? Number(invoice.taxAmount) : null,
        totalAmount: Number(invoice.totalAmount),
      },
      actorId,
    );

    return posted;
  }

  async listClientInvoices(query: ListClientInvoiceQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.ClientInvoiceWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.clientInvoice.findMany({
        where,
        include: { project: { select: { code: true, name: true } }, claim: { select: { claimNumber: true, period: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.clientInvoice.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}