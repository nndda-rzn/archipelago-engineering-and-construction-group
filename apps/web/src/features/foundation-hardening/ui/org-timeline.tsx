import type { OrganizationNode } from '@aec/api-contracts';
import { EmptyState, Input, Label, TimeBand } from '@aec/ui';

/** Ratakan pohon menjadi daftar pita waktu (semua unit, urut DFS). */
function flatten(nodes: OrganizationNode[]): OrganizationNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}

export interface OrgTimelineProps {
  nodes: OrganizationNode[];
  asOf: string;
  onAsOfChange: (value: string) => void;
  /** Rentang sumbu; default setahun terakhir s/d setahun ke depan. */
  from?: string;
  to?: string;
}

/**
 * Tampilan waktu struktur organisasi: tiap unit satu pita `effectiveFrom →
 * effectiveTo` (terbuka = melebar). Scrubber "as of" menggeser penanda; unit
 * yang belum/sudah berakhir tetap tampak agar celah waktu terlihat.
 */
export function OrgTimeline({ nodes, asOf, onAsOfChange, from, to }: OrgTimelineProps) {
  if (nodes.length === 0) {
    return <EmptyState title="No organization units yet" description="Add the first unit to see its timeline." />;
  }
  const bands = flatten(nodes).map((n) => ({
    id: n.item.id,
    label: n.item.name,
    start: n.item.effectiveFrom,
    end: n.item.effectiveTo,
  }));

  const now = new Date();
  const axisFrom = from ?? new Date(now.getUTCFullYear() - 1, 0, 1).toISOString();
  const axisTo = to ?? new Date(now.getUTCFullYear() + 1, 11, 31).toISOString();

  return (
    <div className="flex flex-col gap-2">
      <TimeBand from={axisFrom} to={axisTo} marker={asOf || now.toISOString()} onMarkerChange={onAsOfChange} bands={bands} />
      <div className="max-w-xs">
        <Label htmlFor="org-timeline-asof">As of (refine structure)</Label>
        <Input id="org-timeline-asof" type="date" value={(asOf || now.toISOString()).slice(0, 10)} onChange={(e) => onAsOfChange(e.target.value)} />
      </div>
    </div>
  );
}
