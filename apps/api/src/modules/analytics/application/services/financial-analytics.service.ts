import { Inject, Injectable } from '@nestjs/common';
import type { AnalyticsFilterParams } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { CacheService } from '@/shared/cache/cache.service';
import { ANALYTICS_CACHE_KEYS, analyticsCacheKey } from '@/shared/cache/analytics-cache';
import { resolveDateRange } from '@/shared/utils/date-range';
import { monthKeyUtc } from '@/shared/utils/month-key';
import { lastNMonthsUtc, monthSpanUtc } from './shared/analytics-date';

/** Baris invoice di balik angka sebuah bucket aging. */
export interface AgingDetail {
  invoiceNumber: string;
  party: string;
  projectCode: string | null;
  date: string;
  ageDays: number;
  outstanding: number;
}

/**
 * Analitik keuangan: arus kas, aging AR/AP, konsentrasi piutang, dan rencana kas
 * vs realisasi. Read-only + cache. Dipisah dari executive/operational dan dari
 * perhitungan biaya proyek.
 */
@Injectable()
export class FinancialAnalyticsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  async cashFlow(filter: AnalyticsFilterParams = {}) {
    return this.cache.wrap(analyticsCacheKey(ANALYTICS_CACHE_KEYS.cashFlow, filter), 60, async () => {
      const { from, to } = resolveDateRange(filter.from, filter.to);
      const dateWhere = from || to ? { gte: from, lte: to } : undefined;
      const projectWhere = filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {};
      const [collections, payments] = await this.prisma.$transaction([
        this.prisma.collection.findMany({ where: { status: 'POSTED', ...projectWhere, ...(dateWhere ? { collectedAt: dateWhere } : {}) }, select: { totalAmount: true, collectedAt: true } }),
        this.prisma.payment.findMany({ where: { status: 'PAID', ...projectWhere, ...(dateWhere ? { paymentDate: dateWhere } : {}) }, select: { totalAmount: true, paymentDate: true } }),
      ]);

      const byMonth = new Map<string, { cashIn: number; cashOut: number }>();
      for (const c of collections) {
        const k = monthKeyUtc(new Date(c.collectedAt));
        const cur = byMonth.get(k) ?? { cashIn: 0, cashOut: 0 };
        cur.cashIn += Number(c.totalAmount);
        byMonth.set(k, cur);
      }
      for (const p of payments) {
        const k = monthKeyUtc(new Date(p.paymentDate));
        const cur = byMonth.get(k) ?? { cashIn: 0, cashOut: 0 };
        cur.cashOut += Number(p.totalAmount);
        byMonth.set(k, cur);
      }

      // Rentang bulan: hormati filter bila ada, selain itu 6 bulan terakhir.
      // Bulan tanpa transaksi diisi 0 supaya celah tidak "menghilang" dari grafik.
      const months = from || to ? monthSpanUtc(from ?? to!, to ?? from!) : lastNMonthsUtc(6);
      const series = months.map((month) => {
        const v = byMonth.get(month) ?? { cashIn: 0, cashOut: 0 };
        return { month, cashIn: v.cashIn, cashOut: v.cashOut, net: Math.round((v.cashIn - v.cashOut) * 100) / 100 };
      });
      const totalIn = series.reduce((s, r) => s + r.cashIn, 0);
      const totalOut = series.reduce((s, r) => s + r.cashOut, 0);

      return { series, totalCashIn: totalIn, totalCashOut: totalOut, netCash: Math.round((totalIn - totalOut) * 100) / 100, generatedAt: new Date().toISOString() };
    });
  }

  async aging(filter: AnalyticsFilterParams = {}) {
    return this.cache.wrap(analyticsCacheKey(ANALYTICS_CACHE_KEYS.aging, filter), 60, async () => {
      const asOf = new Date();
      const { from, to } = resolveDateRange(filter.from, filter.to);
      // Basis umur SAMA untuk AR & AP (`invoiceDate`) — sebelumnya AP memakai
      // createdAt sehingga dua sisi "umur" punya arti berbeda.
      const dateWhere = from || to ? { gte: from, lte: to } : undefined;
      const bucketOf = (d: Date): string => {
        const days = Math.floor((asOf.getTime() - d.getTime()) / 86400000);
        if (days <= 0) return 'CURRENT';
        if (days <= 30) return '1-30';
        if (days <= 60) return '31-60';
        if (days <= 90) return '61-90';
        return '90+';
      };
      const ageOf = (d: Date) => Math.max(0, Math.floor((asOf.getTime() - d.getTime()) / 86400000));
      const projectWhere = filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {};

      const clientInvoices = await this.prisma.clientInvoice.findMany({
        where: { status: 'POSTED', ...projectWhere, ...(dateWhere ? { invoiceDate: dateWhere } : {}) },
        include: { collections: { select: { amount: true } }, project: { select: { code: true } } },
      });
      const arBuckets = new Map<string, { amount: number; detail: AgingDetail[] }>();
      for (const inv of clientInvoices) {
        const paid = inv.collections.reduce((s, c) => s + Number(c.amount), 0);
        const remaining = Math.round((Number(inv.totalAmount) - paid) * 100) / 100;
        if (remaining <= 0) continue;
        const date = new Date(inv.invoiceDate);
        const b = bucketOf(date);
        const cur = arBuckets.get(b) ?? { amount: 0, detail: [] };
        cur.amount += remaining;
        cur.detail.push({ invoiceNumber: inv.invoiceNumber, party: inv.client, projectCode: inv.project?.code ?? null, date: date.toISOString(), ageDays: ageOf(date), outstanding: remaining });
        arBuckets.set(b, cur);
      }

      const vendorInvoices = await this.prisma.vendorInvoice.findMany({
        where: { status: 'POSTED', ...projectWhere, ...(dateWhere ? { invoiceDate: dateWhere } : {}) },
        include: { payments: { select: { amount: true } }, project: { select: { code: true } } },
      });
      const apBuckets = new Map<string, { amount: number; detail: AgingDetail[] }>();
      for (const inv of vendorInvoices) {
        const paid = (inv.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
        const remaining = Math.round((Number(inv.totalAmount) - paid) * 100) / 100;
        if (remaining <= 0) continue;
        const date = new Date(inv.invoiceDate);
        const b = bucketOf(date);
        const cur = apBuckets.get(b) ?? { amount: 0, detail: [] };
        cur.amount += remaining;
        cur.detail.push({ invoiceNumber: inv.invoiceNumber, party: inv.vendor, projectCode: inv.project?.code ?? null, date: date.toISOString(), ageDays: ageOf(date), outstanding: remaining });
        apBuckets.set(b, cur);
      }

      const order = ['CURRENT', '1-30', '31-60', '61-90', '90+'];
      const toBucket = (map: Map<string, { amount: number; detail: AgingDetail[] }>) => (b: string) => {
        const v = map.get(b) ?? { amount: 0, detail: [] };
        return { bucket: b, amount: Math.round(v.amount * 100) / 100, detail: v.detail.sort((x, y) => y.outstanding - x.outstanding) };
      };
      return {
        ar: order.map(toBucket(arBuckets)),
        ap: order.map(toBucket(apBuckets)),
        asOf: asOf.toISOString(),
        basisDate: 'invoiceDate',
        generatedAt: new Date().toISOString(),
      };
    });
  }

  /** Konsentrasi piutang per klien — siapa yang menahan kas. */
  async arConcentration(filter: AnalyticsFilterParams = {}) {
    return this.cache.wrap('analytics:ar-concentration', 60, async () => {
      const projectWhere = filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {};
      const invoices = await this.prisma.clientInvoice.findMany({
        where: { status: 'POSTED', ...projectWhere },
        include: { collections: { select: { amount: true } } },
      });
      const byClient = new Map<string, number>();
      for (const inv of invoices) {
        const paid = inv.collections.reduce((s, c) => s + Number(c.amount), 0);
        const remaining = Math.round((Number(inv.totalAmount) - paid) * 100) / 100;
        if (remaining <= 0) continue;
        byClient.set(inv.client, (byClient.get(inv.client) ?? 0) + remaining);
      }
      const total = [...byClient.values()].reduce((s, v) => s + v, 0);
      const items = [...byClient.entries()]
        .map(([client, amount]) => ({ client, amount: Math.round(amount * 100) / 100, pct: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0 }))
        .sort((a, b) => b.amount - a.amount);
      return { items, total: Math.round(total * 100) / 100, generatedAt: new Date().toISOString() };
    });
  }

  /** Rencana kas (`CashForecast`) vs realisasi per periode. */
  async forecastVsActual(filter: AnalyticsFilterParams = {}) {
    return this.cache.wrap('analytics:forecast-vs-actual', 60, async () => {
      const entityWhere = filter.legalEntityId ? { legalEntityId: filter.legalEntityId } : {};
      const projectWhere = filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {};
      const [forecasts, collections, payments] = await this.prisma.$transaction([
        this.prisma.cashForecast.findMany({ where: entityWhere, orderBy: { period: 'asc' }, select: { period: true, netForecast: true } }),
        this.prisma.collection.findMany({ where: { status: 'POSTED', ...projectWhere }, select: { totalAmount: true, collectedAt: true } }),
        this.prisma.payment.findMany({ where: { status: 'PAID', ...projectWhere }, select: { totalAmount: true, paymentDate: true } }),
      ]);
      const actualByMonth = new Map<string, number>();
      for (const c of collections) {
        const k = monthKeyUtc(new Date(c.collectedAt));
        actualByMonth.set(k, (actualByMonth.get(k) ?? 0) + Number(c.totalAmount));
      }
      for (const p of payments) {
        const k = monthKeyUtc(new Date(p.paymentDate));
        actualByMonth.set(k, (actualByMonth.get(k) ?? 0) - Number(p.totalAmount));
      }
      const periods = forecasts.map((f) => ({
        period: f.period,
        forecastNet: Number(f.netForecast),
        actualNet: Math.round((actualByMonth.get(f.period) ?? 0) * 100) / 100,
      }));
      return { periods, generatedAt: new Date().toISOString() };
    });
  }
}
