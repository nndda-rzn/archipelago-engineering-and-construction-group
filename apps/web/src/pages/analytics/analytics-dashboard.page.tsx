import { Badge, Button, StatusBadge } from '@aec/ui';
import { useExecutiveDashboard, useAnomalies, type Anomaly } from '@/features/analytics';
import { formatIdr as fmt } from '@/shared/lib/format';

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <p className="text-caption uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 font-mono tabular-nums text-h2 text-neutral-950">{value}</p>
      {sub && <p className="mt-1 text-caption text-neutral-500">{sub}</p>}
    </div>
  );
}

function AnomalyRow({ anomaly }: { anomaly: Anomaly }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 py-2 last:border-0">
      <div className="flex items-center gap-3">
        <StatusBadge status={anomaly.severity} />
        <span className="font-mono text-caption text-neutral-500">{anomaly.type}</span>
        {anomaly.projectCode && <span className="font-mono text-caption text-neutral-500">{anomaly.projectCode}</span>}
      </div>
      <span className="text-body-sm text-neutral-700">{anomaly.message}</span>
    </div>
  );
}

export function AnalyticsDashboardPage() {
  const { data, isLoading, isError, refetch } = useExecutiveDashboard();
  const anomalies = useAnomalies();

  if (isLoading) return <p className="text-body text-neutral-500">Memuat dashboard…</p>;
  if (isError || !data) {
    return (
      <div>
        <p className="text-body text-destructive-600">Gagal memuat dashboard.</p>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>Coba lagi</Button>
      </div>
    );
  }

  const projectStatus = Object.entries(data.projects.byStatus)
    .map(([s, c]) => `${s}: ${c}`)
    .join(' · ');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 text-neutral-950">Executive Dashboard</h1>
        <p className="mt-1 text-body-sm text-neutral-500">
          Portfolio &amp; KPI lintas domain · diperbarui {new Date(data.generatedAt).toLocaleTimeString('id-ID')} (Fase 10 — advisory)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Total Project" value={String(data.projects.total)} sub={projectStatus} />
        <KpiCard label="Nilai Kontrak" value={fmt(data.projects.totalContractValue)} sub={`Uang muka ${fmt(data.projects.totalAdvance)}`} />
        <KpiCard label="Cash In (Koleksi)" value={fmt(data.finance.cashIn)} sub={`Tagihan klien ${fmt(data.finance.postedClientInvoice)}`} />
        <KpiCard label="Cash Out (Bayar)" value={fmt(data.finance.cashOut)} sub={`Invoice vendor ${fmt(data.finance.postedVendorInvoice)}`} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-5">
        <KpiCard label="Budget" value={fmt(data.finance.totalBudget)} />
        <KpiCard label="Claim DRAFT" value={String(data.operational.openClaims)} />
        <KpiCard label="NCR Terbuka" value={String(data.operational.openNcrs)} />
        <KpiCard label="Insiden Terbuka" value={String(data.operational.openIncidents)} />
        <KpiCard label="PM Lewat" value={String(data.operational.overduePm)} />
      </div>

      <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-h2 text-neutral-950">Anomaly Detection</h2>
          <Badge variant={anomalies.data && anomalies.data.total > 0 ? 'warning' : 'success'}>
            {anomalies.data?.total ?? 0} anomali
          </Badge>
        </div>
        {anomalies.data && anomalies.data.anomalies.length > 0 ? (
          anomalies.data.anomalies.map((a, i) => <AnomalyRow key={`${a.type}-${i}`} anomaly={a} />)
        ) : (
          <p className="text-body-sm text-neutral-500">Tidak ada anomali terdeteksi.</p>
        )}
      </div>
    </div>
  );
}
