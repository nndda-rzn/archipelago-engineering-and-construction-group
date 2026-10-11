import { useState } from 'react';
import { CalendarRange, Layers, MapPin, Milestone as MilestoneIcon } from 'lucide-react';
import { ICON_STROKE, SegmentedControl, Skeleton } from '@aec/ui';
import type { ProjectGantt } from '@aec/api-contracts';
import { useProjectGantt } from '@/entities/project';
import { GanttChart } from '@/shared/charts';

type Group = 'all' | 'schedule' | 'field';

const GROUP_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'schedule', label: 'Work packages' },
  { value: 'field', label: 'Field' },
];

/** Ikon kontekstual per kelompok baris Gantt (bukan ikon generik). */
function groupIcon(group: string) {
  const cls = 'h-3.5 w-3.5';
  if (group === 'Phase') return <Layers className={cls} strokeWidth={ICON_STROKE} aria-hidden="true" />;
  if (group === 'Milestone') return <MilestoneIcon className={cls} strokeWidth={ICON_STROKE} aria-hidden="true" />;
  if (group === 'Field') return <MapPin className={cls} strokeWidth={ICON_STROKE} aria-hidden="true" />;
  return <CalendarRange className={cls} strokeWidth={ICON_STROKE} aria-hidden="true" />;
}

/**
 * Gantt proyek: baris fase + milestone + paket kerja + work package pada satu
 * sumbu waktu, dengan progress di dalam bar, baseline ghost, diamond milestone,
 * dan penanda jalur kritis. Filter kelompok agar bisa difokuskan.
 */
export function ProjectGanttView({ projectId, defaultGroup = 'all' }: { projectId: string; defaultGroup?: Group }) {
  const gantt = useProjectGantt(projectId);
  const [group, setGroup] = useState<Group>(defaultGroup);

  if (gantt.isLoading) return <Skeleton className="h-64 w-full" />;
  if (gantt.isError || !gantt.data) return <p className="text-body-sm text-neutral-500">Could not load the schedule.</p>;

  const data: ProjectGantt = gantt.data;
  const rows = group === 'all' ? data.rows : group === 'field' ? data.rows.filter((r) => r.group === 'Field') : data.rows.filter((r) => r.group === 'Work package');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl aria-label="Gantt group" options={GROUP_OPTIONS} value={group} onValueChange={(v) => setGroup(v as Group)} />
        <span className="text-caption text-neutral-500">{rows.length} activities · {rows.filter((r) => r.isCriticalPath).length} on the critical path</span>
        <span className="ml-auto flex items-center gap-2 text-caption text-neutral-500">
          {groupIcon('Phase')} phase
          {groupIcon('Milestone')} milestone
          {groupIcon('Field')} field
        </span>
      </div>
      <GanttChart rows={rows} from={data.startDate ?? undefined} to={data.completionDate ?? undefined} />
    </div>
  );
}
