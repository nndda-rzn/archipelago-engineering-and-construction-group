const PHASES = ['INITIATION', 'FEED', 'ENGINEERING', 'PROCUREMENT', 'CONSTRUCTION', 'COMMISSIONING', 'CLOSEOUT'] as const;
const PHASE_LABEL: Record<string, string> = {
  INITIATION: 'Initiation', FEED: 'FEED', ENGINEERING: 'Engineering', PROCUREMENT: 'Procurement',
  CONSTRUCTION: 'Construction', COMMISSIONING: 'Commissioning', CLOSEOUT: 'Closeout',
};

/**
 * Ribbon fase: posisi proyek di siklus hidup EPC. Visual ditentukan **bentuk
 * data** (deret fase berurutan), bukan selera: fase yang sudah dilalui terisi,
 * fase aktif ditebalkan + garis, fase berikutnya kosong. Gate ditampilkan
 * sebagai penanda di antara fase. `role="img"` + aria-label memuat fase aktif.
 */
export function PhaseRibbon({ phase, gates }: { phase: string; gates: Array<{ gate: string; decision: string }> }) {
  const currentIdx = PHASES.indexOf(phase as (typeof PHASES)[number]);
  const holdGate = gates.find((g) => g.decision === 'HOLD');
  return (
    <div className="flex flex-col gap-2">
      <div role="img" aria-label={`Lifecycle phase: ${PHASE_LABEL[phase] ?? phase} (step ${currentIdx + 1} of ${PHASES.length})`} className="flex items-stretch gap-1">
        {PHASES.map((p, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={p} className="flex min-w-0 flex-1 flex-col gap-1">
              <span
                data-slot="phase-bar"
                data-state={active ? 'active' : done ? 'done' : 'todo'}
                className={`h-1.5 rounded-full ${active ? 'bg-racing-red-600' : done ? 'bg-neutral-700' : 'bg-neutral-200'}`}
              />
              <span className={`truncate text-caption ${active ? 'font-medium text-neutral-900' : done ? 'text-neutral-600' : 'text-neutral-400'}`} title={PHASE_LABEL[p]}>
                {PHASE_LABEL[p]}
              </span>
            </div>
          );
        })}
      </div>
      {(holdGate || gates.length > 0) && (
        <p className="text-caption text-neutral-500">
          {gates.length} gate passed
          {holdGate ? <span className="ml-2 rounded border border-warning-300 bg-warning-50 px-1.5 py-px text-warning-700">Gate on HOLD</span> : null}
        </p>
      )}
    </div>
  );
}
