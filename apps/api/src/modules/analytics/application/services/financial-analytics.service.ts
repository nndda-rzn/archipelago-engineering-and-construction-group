import { Inject, Injectable } from '@nestjs/common';
import type { Aging, AnalyticsFilterParams, CashFlow } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { CacheService } from '@/shared/cache/cache.service';
import { ANALYTICS_CACHE_KEYS, analyticsCacheKey } from '@/shared/cache/analytics-cache';
import { resolveDateRange } from '@/shared/utils/date-range';
import { monthKeyUtc } from '@/shared/utils/month-key';
import { lastNMonthsUtc, monthSpanUtc, previousPeriodBounds } from './shared/analytics-date';
import { computeDelta } from './shared/analytics-metrics';

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
 * Jendela waktu arus kas: hormati filter bila ada, selain itu 6 bulan terakhir
 * (termasuk bulan berjalan) — sama dengan yang dipakai `computeCashFlow` untuk
 * membentuk seri, supaya periode pembanding menggeser jendela yang identik.
 */
function cashFlowWindow(filter: AnalyticsFilterParams, now: Date = new Date()): { from: Date; to: Date } {
  const { from, to } = resolveDateRange(filter.from, filter.to);
  if (from || to) {
    return { from: from ?? to!, to: to ?? from! };
  }
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { from: start, to: end };
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

  async cashFlow(filter: AnalyticsFilterParams = {}, compare?: 'previous'): Promise<CashFlow> {
    const result = await this.cache.wrap(analyticsCacheKey(ANALYTICS_CACHE_KEYS.cashFlow, filter), 60, () =>
      this.computeCashFlow(filter),
    );
    if (compare !== 'previous') return result;

    // Pembanding: geser mundur sepanjang jendela yang sama (6 bulan bila tanpa filter).
    const window = cashFlowWindow(filter);
    const prev = previousPeriodBounds({
      from: window.from.toISOString().slice(0, 10),
      to: window.to.toISOString().slice(0, 10),
    });
    const previous = await this.computeCashFlow({
      legalEntityId: filter.legalEntityId,
      from: prev.from.toISOString().slice(0, 10),
      to: prev.to.toISOString().slice(0, 10),
    });

    return {
      ...result,
      delta: {
        totalCashIn: computeDelta(result.totalCashIn, previous.totalCashIn),
        totalCashOut: computeDelta(result.totalCashOut, previous.totalCashOut),
        netCash: computeDelta(result.netCash, previous.netCash),
      },
    };
  }

  private async computeCashFlow(filter: AnalyticsFilterParams) {
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
  }

  async aging(filter: AnalyticsFilterParams = {}, compare?: 'previous'): Promise<Aging> {
    const result = await this.cache.wrap(analyticsCacheKey(ANALYTICS_CACHE_KEYS.aging, filter), 60, () =>
      this.computeAging(filter, new Date()),
    );
    if (compare !== 'previous') return result;

    // Aging adalah **stok** (snapshot), bukan aliran. Pembanding direkonstruksi
    // sebagai outstanding pada akhir periode sebelumnya: umur dihitung relatif
    // `asOf` lama, dan pembayaran setelah tanggal itu sengaja diabaikan.
    const prev = previousPeriodBounds(filter);
    const previous = await this.computeAging(
      { legalEntityId: filter.legalEntityId, from: prev.from.toISOString().slice(0, 10), to: prev.to.toISOString().slice(0, 10) },
      prev.to,
    );

    const totalOf = (buckets: { amount: number }[]) => Math.round(buckets.reduce((s, b) => s + b.amount, 0) * 100) / 100;

    return {
      ...result,
      delta: {
        ar: computeDelta(totalOf(result.ar), totalOf(previous.ar)),
        ap: computeDelta(totalOf(result.ap), totalOf(previous.ap)),
        arOverdue: computeDelta(result.arOverdue, previous.arOverdue),
        apOverdue: computeDelta(result.apOverdue, previous.apOverdue),
      },
    };
  }

  private async computeAging(filter: AnalyticsFilterParams, asOf: Date) {
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
    // Pembayaran dihitung hanya bila terjadi pada/ sebelum `asOf`. Baris tanpa
    // tanggal (data lama / mock) tetap dihitung agar perilaku lama tak berubah.
    const paidBy = (asOfMs: number) => (rows: { amount: unknown; at?: Date | string | null }[]) =>
      rows.reduce((s, r) => {
        const t = r.at ? new Date(r.at).getTime() : Number.NEGATIVE_INFINITY;
        return t <= asOfMs ? s + Number(r.amount) : s;
      }, 0);
    const projectWhere = filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {};
    const asOfMs = asOf.getTime();

    const clientInvoices = await this.prisma.clientInvoice.findMany({
      where: { status: 'POSTED', ...projectWhere, ...(dateWhere ? { invoiceDate: dateWhere } : {}) },
      include: { collections: { select: { amount: true, collection: { select: { collectedAt: true } } } }, project: { select: { code: true } } },
    });
    const arBuckets = new Map<string, { amount: number; detail: AgingDetail[] }>();
    for (const inv of clientInvoices) {
      const paid = paidBy(asOfMs)(inv.collections.map((c) => ({ amount: c.amount, at: c.collection?.collectedAt })));
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
      include: { payments: { select: { amount: true, payment: { select: { paymentDate: true } } } }, project: { select: { code: true } } },
    });
    const apBuckets = new Map<string, { amount: number; detail: AgingDetail[] }>();
    for (const inv of vendorInvoices) {
      const paid = paidBy(asOfMs)((inv.payments ?? []).map((p) => ({ amount: p.amount, at: p.payment?.paymentDate })));
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
    const ar = order.map(toBucket(arBuckets));
    const ap = order.map(toBucket(apBuckets));
    const overdue = (buckets: { bucket: string; amount: number }[]) =>
      Math.round(buckets.filter((b) => b.bucket !== 'CURRENT').reduce((s, b) => s + b.amount, 0) * 100) / 100;

    return {
      ar,
      ap,
      arOverdue: overdue(ar),
      apOverdue: overdue(ap),
      asOf: asOf.toISOString(),
      basisDate: 'invoiceDate',
      generatedAt: new Date().toISOString(),
    };
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
