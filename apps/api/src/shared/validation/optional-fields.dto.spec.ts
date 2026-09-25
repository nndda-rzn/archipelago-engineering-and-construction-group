import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { CreateClientInvoiceDto } from '@/modules/finance/presentation/dto/client-invoice.dto';
import { CreateProgressClaimDto } from '@/modules/finance/presentation/dto/progress-claim.dto';
import { ListPaymentQueryDto } from '@/modules/finance/presentation/dto/payment.dto';
import { CreateWorkflowDefinitionDto } from '@/modules/approval/presentation/dto/approval.dto';

/**
 * Regresi untuk bug yang ditemukan saat verifikasi PR-F4: properti yang **dirancang opsional**
 * (service memakai `?? default`) ternyata ditolak 400 bila tidak dikirim, karena dekorator
 * validasinya tidak disertai `@IsOptional()`.
 *
 * Dua kasus nyata:
 *  - `CreateClientInvoiceDto.taxAmount` — service: `dto.taxAmount ?? 0`. Tanpa @IsOptional(),
 *    pembuatan client invoice tanpa PPN gagal, sehingga jalur AR tidak bisa dipakai sama sekali.
 *  - `CreateWorkflowDefinitionDto.status` — service: `dto.status ?? 'DRAFT'`. Tanpa @IsOptional(),
 *    workflow definition tidak bisa dibuat tanpa menyebut status eksplisit.
 *
 * Pipe di bawah harus mencerminkan konfigurasi nyata di `app.module.ts` supaya yang diuji adalah
 * perilaku produksi, bukan tiruan yang lebih longgar.
 */
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

const runBody = (metatype: new () => unknown, value: Record<string, unknown>) =>
  pipe.transform(value, { type: 'body', metatype });
const runQuery = (metatype: new () => unknown, value: Record<string, unknown>) =>
  pipe.transform(value, { type: 'query', metatype });

describe('DTO: field opsional benar-benar opsional', () => {
  describe('CreateClientInvoiceDto.taxAmount', () => {
    it('tanpa taxAmount -> diterima dan tetap undefined (bukan ditolak/diisi NaN)', async () => {
      const result = (await runBody(CreateClientInvoiceDto, { claimId: 'claim-1' })) as CreateClientInvoiceDto;
      expect(result.claimId).toBe('claim-1');
      expect(result.taxAmount).toBeUndefined();
    });

    it('dengan taxAmount -> tetap dikonversi ke number', async () => {
      const result = (await runBody(CreateClientInvoiceDto, { claimId: 'claim-1', taxAmount: '11' })) as CreateClientInvoiceDto;
      expect(result.taxAmount).toBe(11);
    });

    it('taxAmount negatif tetap ditolak', async () => {
      await expect(runBody(CreateClientInvoiceDto, { claimId: 'claim-1', taxAmount: -1 })).rejects.toBeDefined();
    });
  });

  describe('CreateWorkflowDefinitionDto.status', () => {
    const base = { code: 'PR_APPROVAL', name: 'PR Approval', transactionType: 'PurchaseRequisition' };

    it('tanpa status -> diterima (service memakai default DRAFT)', async () => {
      const result = (await runBody(CreateWorkflowDefinitionDto, base)) as CreateWorkflowDefinitionDto;
      expect(result.status).toBeUndefined();
    });

    it('status tidak dikenal tetap ditolak', async () => {
      await expect(runBody(CreateWorkflowDefinitionDto, { ...base, status: 'NOPE' })).rejects.toBeDefined();
    });
  });

  describe('field opsional lain tetap berfungsi', () => {
    it('CreateProgressClaimDto hanya field wajib -> diterima', async () => {
      const result = (await runBody(CreateProgressClaimDto, { projectId: 'proj-1', amount: '100' })) as CreateProgressClaimDto;
      expect(result.amount).toBe(100);
      expect(result.requestedExtensionDays).toBeUndefined();
      expect(result.physicalProgressAtClaim).toBeUndefined();
      expect(result.billableProgress).toBeUndefined();
    });

    it('ListPaymentQueryDto tanpa query -> diterima', async () => {
      const result = (await runQuery(ListPaymentQueryDto, {})) as ListPaymentQueryDto;
      expect(result.page).toBeUndefined();
      expect(result.pageSize).toBeUndefined();
    });
  });
});
