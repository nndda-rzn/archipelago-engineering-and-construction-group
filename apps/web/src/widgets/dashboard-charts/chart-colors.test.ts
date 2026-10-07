import { describe, expect, it } from 'vitest';
import { CHART, HEALTH_COLORS, AGING_COLORS, COST_COLORS, OUTCOME_COLORS, CATEGORICAL_COLORS } from './chart-colors';

describe('chart-colors', () => {
  it('uses the neutral-200 token for grid lines and neutral-300 for strong', () => {
    expect(CHART.grid).toBe('#e4e4e7');
    expect(CHART.gridStrong).toBe('#d4d4d8');
  });

  it('maps every health key to a shade that reads on white (>= 600)', () => {
    // Dot health versi 500 (#22c55e/#f59e0b) hanya ~2:1 dan gagal WCAG 1.4.11,
    // jadi health memakai shade 700/500 yang lebih gelap.
    expect(HEALTH_COLORS.ON_TRACK).toBe('#15803d');
    expect(HEALTH_COLORS.AT_RISK).toBe('#b45309');
    expect(HEALTH_COLORS.CRITICAL).toBe('#b91c1c');
    expect(HEALTH_COLORS.NO_BUDGET).toBe('#71717a');
  });

  it('has five aging colours forming a monotonic ramp (green -> red)', () => {
    expect(AGING_COLORS).toHaveLength(5);
    // Ramp monoton: tidak ada abu-abu di tengah, hijau di awal, merah di akhir.
    expect(AGING_COLORS[0]).toBe('#16a34a');
    expect(AGING_COLORS[4]).toBe('#b91c1c');
    expect(AGING_COLORS).not.toContain('#a1a1aa');
  });

  it('covers every costType', () => {
    for (const k of ['DIRECT', 'LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT', 'INDIRECT', 'OVERHEAD']) {
      expect(COST_COLORS[k]).toBeTruthy();
    }
  });

  it('never uses brand red as a cost category', () => {
    // Merah = aksi/kritis; kategori memakai palet categorical aman buta warna.
    for (const v of Object.values(COST_COLORS)) {
      expect(v).not.toBe('#dc2626');
      expect(v).not.toBe('#b91c1c');
    }
    expect(CATEGORICAL_COLORS).toContain(COST_COLORS.MATERIAL);
  });

  it('maps approval outcomes to the semantic tokens (shade 700/500)', () => {
    expect(OUTCOME_COLORS.approved).toBe('#15803d'); // success-700
    expect(OUTCOME_COLORS.rejected).toBe('#b91c1c'); // destructive-700
    expect(OUTCOME_COLORS.pending).toBe('#b45309'); // warning-700
    expect(OUTCOME_COLORS.cancelled).toBe('#71717a'); // neutral-500
  });

  it('pins the shared structural + semantic values (blast-radius guard)', () => {
    // Palet ini dipakai LINTAS-HALAMAN (termasuk approval/workflow). Test ini
    // sengaja mengunci nilainya supaya perubahan tak sengaja pada satu halaman
    // tidak diam-diam mengubah halaman lain.
    expect(CHART.grid).toBe('#e4e4e7');
    expect(CHART.gridStrong).toBe('#d4d4d8');
    expect(CHART.axis).toBe('#71717a');
    expect(CHART.cursor).toBe('#f4f4f5');
    expect(CHART.positive).toBe('#15803d');
    expect(CHART.negative).toBe('#b91c1c');
    expect(CHART.accent).toBe('#dc2626');
    expect(CHART.strong).toBe('#27272a');
    expect(CHART.info).toBe('#1d4ed8');
  });

  it('keeps every semantic data mark at >= 3:1 contrast on white (WCAG 1.4.11)', () => {
    // Perhitungan rasio kontras relatif (WCAG). Ambang 3:1 untuk elemen grafis.
    const luminance = (hex: string): number => {
      const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
      return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
    };
    const contrastOnWhite = (hex: string) => (1.05) / (luminance(hex) + 0.05);

    for (const [name, hex] of Object.entries({ positive: CHART.positive, negative: CHART.negative, axis: CHART.axis, info: CHART.info })) {
      expect({ name, ratio: Math.round(contrastOnWhite(hex) * 10) / 10 }).toEqual(
        expect.objectContaining({ ratio: expect.any(Number) }),
      );
      expect(contrastOnWhite(hex)).toBeGreaterThanOrEqual(3);
    }
  });
});
