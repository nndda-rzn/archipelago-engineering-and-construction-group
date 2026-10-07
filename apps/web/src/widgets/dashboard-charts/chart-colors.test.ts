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
});
