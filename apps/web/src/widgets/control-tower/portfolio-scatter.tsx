import { useMemo } from 'react';
import { CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { ControlTowerProject } from '@aec/api-contracts';
import { CHART, HEALTH_COLORS } from '@/widgets/dashboard-charts/chart-colors';

export interface PortfolioScatterProps {
  projects: ControlTowerProject[];
}

/** Titik scatter hanya untuk proyek yang benar-benar punya EVM (cpi & spi non-null). */
export function evmPoints(projects: ControlTowerProject[]): { projectId: string; projectCode: string; health: ControlTowerProject['health']; cpi: number; spi: number }[] {
  return projects
    .filter((p) => p.hasEvm && p.cpi != null && p.spi != null)
    .map((p) => ({ projectId: p.projectId, projectCode: p.projectCode, health: p.health, cpi: p.cpi as number, spi: p.spi as number }));
}

/**
 * Scatter CPI (x) × SPI (y) dengan garis referensi 1.0. Warna titik mengikuti
 * health (lihat `HEALTH_COLORS`) dan **selalu** ada padanan teks (daftar nilai
 * di bawah chart) agar makna tidak bergantung pada warna (WCAG 1.4.1).
 * Tanpa proyek ber-EVM → empty state jujur, bukan chart kosong menyesatkan.
 */
export function PortfolioScatter({ projects }: PortfolioScatterProps) {
  const points = useMemo(() => evmPoints(projects), [projects]);

  if (points.length === 0) {
    return <p className="py-6 text-center text-body-sm text-neutral-500">No EVM baseline published yet.</p>;
  }

  return (
    <div data-slot="portfolio-scatter">
      <div role="img" aria-label={`CPI vs SPI for ${points.length} projects: ${points.map((p) => `${p.projectCode} CPI ${p.cpi.toFixed(2)} SPI ${p.spi.toFixed(2)}`).join(', ')}`}>
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
            <XAxis type="number" dataKey="cpi" name="CPI" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} />
            <YAxis type="number" dataKey="spi" name="SPI" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} width={40} />
            <ReferenceLine x={1} stroke={CHART.gridStrong} />
            <ReferenceLine y={1} stroke={CHART.gridStrong} />
            <Tooltip
              formatter={(v: unknown) => (typeof v === 'number' ? v.toFixed(2) : String(v))}
              contentStyle={{ fontSize: 12 }}
            />
            <Scatter data={points} isAnimationActive={false}>
              {points.map((p) => (
                <Cell key={p.projectId} fill={HEALTH_COLORS[p.health]} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {/* Padanan non-warna: nilai tiap titik sebagai teks. */}
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {points.map((p) => (
          <li key={p.projectId} className="flex items-center gap-1.5 text-caption text-neutral-600">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: HEALTH_COLORS[p.health] }} aria-hidden="true" />
            <span className="font-mono">{p.projectCode}</span>
            <span className="font-mono tabular-nums text-neutral-500">
              {p.cpi.toFixed(2)} / {p.spi.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-caption text-neutral-500">X = CPI · Y = SPI · reference at 1.0</p>
    </div>
  );
}
