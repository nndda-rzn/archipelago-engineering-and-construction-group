import { ScopeBar, useAnalyticsScope, TrendExplorer, DecompositionBars, RankingsTable, Distributions } from '@/features/analytics/ui';

/**
 * `/analytics` — Analytical Workspace.
 *
 * Menjawab "kenapa angka bergerak, dan ke mana arahnya" — melengkapi Control
 * Tower (`/`) yang menjawab "apa posisi sekarang" dan Advanced Reporting
 * (`/analytics/reporting`) yang menyajikan dokumen. Karena itu anomaly triage
 * (milik `/`) dan angka saldo bank (milik `/`) sengaja TIDAK ada di sini.
 *
 * Lima zona: Scope → Trend explorer → What moved it → Rankings → Distributions.
 * State scope hidup di URL (dapat dibagikan). Zona 2 (metrik/dimensi) menyaring
 * Zona 3 lewat state yang sama.
 */
export function AnalyticsDashboardPage() {
  const { filter, metric, setMetric, dimension, setDimension, compare } = useAnalyticsScope();

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-tier">
      <header>
        <h1 className="text-h1 text-neutral-950">Executive dashboard</h1>
        <p className="mt-1 text-body-sm text-neutral-500">
          Trends, drivers &amp; rankings across the portfolio · scope and period are shareable via the URL
        </p>
      </header>

      <ScopeBar />

      <TrendExplorer metric={metric} onMetricChange={setMetric} filter={filter} compare={compare} />

      <DecompositionBars
        metric={metric}
        dimension={dimension}
        onDimensionChange={setDimension}
        filter={filter}
        compare={compare}
      />

      <RankingsTable
        title="Top contributors"
        metric={metric}
        dimension={dimension}
        filter={filter}
        compare={compare}
      />

      <Distributions filter={filter} />
    </div>
  );
}
