import { Inject, Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';
import type { AnalyticsFilterParams } from '@aec/api-contracts';
import { toCsvLines } from '@/shared/export/csv';
import { FinancialAnalyticsService } from './financial-analytics.service';
import { ProjectAnalyticsService } from './project-analytics.service';

/**
 * Export CSV streaming untuk laporan berat. Mendelegasikan perhitungan ke
 * capability service yang sama (satu sumber angka), lalu membentuk baris CSV.
 * Dipisah supaya pembentukan CSV tidak mengotori logika analitik.
 */
@Injectable()
export class AnalyticsExportService {
  constructor(
    @Inject(FinancialAnalyticsService) private readonly financial: FinancialAnalyticsService,
    @Inject(ProjectAnalyticsService) private readonly project: ProjectAnalyticsService,
  ) {}

  /** Export Aging AP/AR sebagai CSV streaming. Mengikuti filter yang aktif (entity + rentang tanggal). */
  async exportAgingCsv(filter: AnalyticsFilterParams = {}): Promise<Readable> {
    const data = await this.financial.aging(filter);
    async function* rows(): AsyncGenerator<string[]> {
      yield ['section', 'bucket', 'amount', 'invoice', 'party', 'project', 'date', 'ageDays', 'outstanding'];
      for (const r of data.ar) {
        if (r.detail.length === 0) yield ['AR', r.bucket, String(r.amount), '', '', '', '', '', ''];
        for (const d of r.detail) yield ['AR', r.bucket, String(r.amount), d.invoiceNumber, d.party, d.projectCode ?? '', d.date, String(d.ageDays), String(d.outstanding)];
      }
      for (const r of data.ap) {
        if (r.detail.length === 0) yield ['AP', r.bucket, String(r.amount), '', '', '', '', '', ''];
        for (const d of r.detail) yield ['AP', r.bucket, String(r.amount), d.invoiceNumber, d.party, d.projectCode ?? '', d.date, String(d.ageDays), String(d.outstanding)];
      }
    }
    return Readable.from(toCsvLines(rows()));
  }

  /** Export Cash Flow (series bulanan) sebagai CSV streaming. Mengikuti filter. */
  async exportCashFlowCsv(filter: AnalyticsFilterParams = {}): Promise<Readable> {
    const data = await this.financial.cashFlow(filter);
    async function* rows(): AsyncGenerator<string[]> {
      yield ['month', 'cashIn', 'cashOut', 'net'];
      for (const r of data.series) yield [r.month, String(r.cashIn), String(r.cashOut), String(r.net)];
    }
    return Readable.from(toCsvLines(rows()));
  }

  /** Export Project Cost Summary sebagai CSV streaming. Mengikuti filter. */
  async exportProjectCostSummaryCsv(filter: AnalyticsFilterParams = {}): Promise<Readable> {
    const data = await this.project.projectCostSummary(filter);
    async function* rows(): AsyncGenerator<string[]> {
      yield ['projectCode', 'projectName', 'contractValue', 'budget', 'cost', 'revenue', 'margin', 'budgetUsagePct'];
      for (const r of data.items) {
        yield [
          r.projectCode, r.projectName,
          String(r.contractValue), String(r.budget), String(r.cost), String(r.revenue),
          String(r.margin), String(r.budgetUsagePct),
        ];
      }
    }
    return Readable.from(toCsvLines(rows()));
  }
}
