import type { WorkflowInsights } from '@aec/api-contracts';
import { cn } from '@aec/ui';

export interface FunnelStage {
  label: string;
  value: number;
}

/**
 * Ubah sebaran task per langkah menjadi tahap funnel.
 *
 * Rantai approval adalah **alur** (masuk → langkah 1 → langkah 2 → selesai), dan
 * bentuk yang benar untuk alur adalah funnel: ia menunjukkan di mana dokumen
 * gugur, yang justru pertanyaan inti saat menilai sebuah rantai. Batang
 * berperingkat menjawab "mana yang paling banyak", bukan "di mana berhenti".
 *
 * Fungsi murni supaya bisa diuji tanpa merender.
 */
export function funnelStages(byStep: WorkflowInsights['byStep']): FunnelStage[] {
  if (byStep.length === 0) return [];
  const stages: FunnelStage[] = [];
  const entered = byStep[0]!.total;
  stages.push({ label: 'Entered', value: entered });
  for (const s of byStep) {
    stages.push({ label: `Step ${s.stepOrder}`, value: s.total });
  }
  const last = byStep[byStep.length - 1]!;
  stages.push({ label: 'Approved', value: last.approved });
  return stages;
}

/**
 * Funnel dokumen: masuk → tiap langkah → disetujui.
 *
 * Lebar tiap tahap proporsional terhadap tahap terbesar. Warna netral untuk
 * semua tahap kecuali hasil akhir (`success`), karena hanya hasil akhir yang
 * bermakna "selesai" — mewarnai setiap tahap akan mengubah funnel menjadi
 * dekorasi. Angka selalu hadir sebagai teks, jadi warna bukan satu-satunya sinyal.
 */
export function WorkflowFunnel({ byStep }: { byStep: WorkflowInsights['byStep'] }) {
  const stages = funnelStages(byStep);
  if (stages.length === 0) return null;

  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div
      role="img"
      aria-label={stages.map((s) => `${s.label}: ${s.value} document${s.value === 1 ? '' : 's'}`).join(', ')}
      className="space-y-1.5"
    >
      {stages.map((stage, index) => {
        const pct = Math.max((stage.value / max) * 100, stage.value > 0 ? 2 : 0);
        const isResult = index === stages.length - 1;
        return (
          <div key={stage.label} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3">
            <span className="whitespace-nowrap text-caption text-neutral-600">{stage.label}</span>
            <span className="h-4 overflow-hidden rounded-sm bg-neutral-100">
              <span
                data-slot="funnel-bar"
                className={cn('block h-full rounded-sm', isResult ? 'bg-success-500' : 'bg-neutral-800')}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="whitespace-nowrap font-mono text-caption tabular-nums text-neutral-700">{stage.value}</span>
          </div>
        );
      })}
    </div>
  );
}
