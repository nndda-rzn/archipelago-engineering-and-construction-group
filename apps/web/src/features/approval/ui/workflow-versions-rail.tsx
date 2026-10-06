import { useState } from 'react';
import { Badge, Button, StatusBadge, cn } from '@aec/ui';
import type { WorkflowVersionDiff, WorkflowVersionSummary } from '@aec/api-contracts';
import { formatDate } from '@/shared/lib/format';
import { useWorkflowVersionDiff } from '../model/workflow-definition.api';
import { VERSION_STATUS_LABEL } from './workflow-labels';

export interface WorkflowVersionsRailProps {
  versions: WorkflowVersionSummary[];
  selectedVersion: number;
  onSelectVersion: (version: number) => void;
}

/**
 * Riwayat versi sebagai rail berurut (bukan tabel): nomor versi adalah identitas,
 * statusnya menentukan apa yang boleh diubah, dan perbandingan antar dua versi
 * menjelaskan apa yang sebenarnya berubah, bukan sekadar "ada versi baru".
 */
export function WorkflowVersionsRail({ versions, selectedVersion, onSelectVersion }: WorkflowVersionsRailProps) {
  const [compareWith, setCompareWith] = useState<number | null>(null);
  const compareTarget = versions.find((v) => v.version !== selectedVersion);
  const active = compareWith ?? compareTarget?.version ?? null;
  const code = versions[0]?.code ?? null;
  const diff = useWorkflowVersionDiff(code, active, selectedVersion);

  if (versions.length === 0) {
    return <p className="text-body-sm text-neutral-500">No version history yet.</p>;
  }

  return (
    <div className="space-y-4">
      <ol className="relative" aria-label="Workflow versions">
        {versions.map((v, index) => {
          const selected = v.version === selectedVersion;
          const inUse = v.isActive;
          const last = index === versions.length - 1;
          return (
            <li key={v.id} className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3">
              {/* Sumbu tangga: menyambung antar versi, berhenti di versi terakhir. */}
              <span className="relative flex justify-center">
                {!last && <span aria-hidden="true" className="absolute inset-y-0 w-px bg-neutral-200" />}
                <span
                  aria-hidden="true"
                  data-slot="version-dot"
                  data-in-use={inUse ? 'true' : undefined}
                  className={cn(
                    'relative z-10 mt-2.5 h-3 w-3 rounded-full',
                    inUse ? 'bg-neutral-800' : 'border border-neutral-300 bg-white',
                    selected && !inUse && 'ring-2 ring-neutral-800 ring-offset-1',
                  )}
                />
              </span>

              <div
                className={cn(
                  'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-3 py-2',
                  selected ? 'bg-neutral-50' : 'hover:bg-neutral-50',
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectVersion(v.version)}
                  aria-pressed={selected}
                  aria-label={`Version ${v.version}, ${VERSION_STATUS_LABEL[v.status] ?? v.status}, ${v.stepCount} step${v.stepCount === 1 ? '' : 's'}`}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                >
                  <span className="font-mono text-body-sm font-semibold text-neutral-900">v{v.version}</span>
                  <StatusBadge status={v.status} label={VERSION_STATUS_LABEL[v.status] ?? v.status} />
                  {inUse && <Badge variant="success">In use</Badge>}
                  <span className="truncate text-caption text-neutral-500">{v.name}</span>
                  <span className="ml-auto shrink-0 font-mono text-caption tabular-nums text-neutral-500">
                    {v.stepCount} step{v.stepCount === 1 ? '' : 's'}
                  </span>
                </button>
                <span className="shrink-0 text-caption text-neutral-500">
                  {formatDate(v.createdAt)}
                  {v.createdByName ? `, ${v.createdByName}` : ''}
                </span>
                {!selected && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCompareWith(v.version)}
                    aria-label={`Compare version ${v.version} with version ${selectedVersion}`}
                  >
                    Compare
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {compareWith != null && (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-body-sm text-neutral-700">
              Comparing <span className="font-mono">v{compareWith}</span> → <span className="font-mono">v{selectedVersion}</span>
            </p>
            <Button size="sm" variant="ghost" onClick={() => setCompareWith(null)}>Close</Button>
          </div>
          {diff.isLoading && <p className="text-caption text-neutral-500">Loading comparison…</p>}
          {diff.isError && <p className="text-caption text-destructive-600">Could not load the comparison.</p>}
          {diff.data && <VersionDiffView diff={diff.data} />}
        </div>
      )}
    </div>
  );
}

function VersionDiffView({ diff }: { diff: WorkflowVersionDiff }) {
  const empty = diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0;
  if (empty) {
    return <p className="text-caption text-neutral-500">No differences in steps between these versions.</p>;
  }
  return (
    <div className="space-y-2 text-body-sm">
      {diff.added.map((s) => (
        <p key={`a-${s.stepOrder}`} className="text-success-700">
          <span aria-hidden="true">+ </span>
          <span className="sr-only">Added: </span>
          Step {s.stepOrder}: {s.name}
        </p>
      ))}
      {diff.removed.map((s) => (
        <p key={`r-${s.stepOrder}`} className="text-destructive-700">
          <span aria-hidden="true">− </span>
          <span className="sr-only">Removed: </span>
          Step {s.stepOrder}: {s.name}
        </p>
      ))}
      {diff.changed.map((c) => (
        <div key={`c-${c.stepOrder}`}>
          <p className="text-neutral-800">
            <span aria-hidden="true">~ </span>
            <span className="sr-only">Changed: </span>
            Step {c.stepOrder}
          </p>
          <ul className="ml-4 list-disc text-caption text-neutral-600">
            {c.fields.map((f) => (
              <li key={f.field}>
                {f.field}: <span className="font-mono">{f.from ?? 'Not set'}</span> to <span className="font-mono">{f.to ?? 'Not set'}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
