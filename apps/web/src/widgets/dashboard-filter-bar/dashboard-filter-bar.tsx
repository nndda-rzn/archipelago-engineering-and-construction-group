import { Button, EntitySelect, FilterChip, SegmentedControl } from '@aec/ui';
import { useLegalEntities } from '@/entities/legal-entity';
import { useUrlFilter } from '@/shared/lib/use-url-state';
import { resolvePeriod, type DashboardFilter, type PeriodPreset } from '@/shared/lib/dashboard-period';
import { LastUpdated } from '@/widgets/last-updated';

const PERIOD_OPTIONS = [
  { value: 'MTD', label: 'MTD' },
  { value: 'QTD', label: 'QTD' },
  { value: 'YTD', label: 'YTD' },
  { value: '12M', label: '12M' },
];

/** Filter yang sedang aktif (bukan preset periode). Urut: entity, health, bucket. */
export function activeFilters(input: { period: string; entity: string; health: string; bucket: string }): { key: string; label: string }[] {
  const list: { key: string; label: string }[] = [];
  if (input.entity) list.push({ key: 'entity', label: `Entity: ${input.entity}` });
  if (input.health) list.push({ key: 'health', label: `Health: ${input.health}` });
  if (input.bucket) list.push({ key: 'bucket', label: `Aging: ${input.bucket}` });
  return list;
}

/** State filter dashboard yang hidup di URL (periode + legal entity). */
export function useDashboardFilter(): {
  filter: DashboardFilter;
  preset: PeriodPreset;
  entityId: string;
  setPreset: (value: string) => void;
  setEntity: (value: string) => void;
} {
  const [period, setPeriod] = useUrlFilter('period', 'YTD');
  const [entity, setEntity] = useUrlFilter('entity');
  const preset = (period || 'YTD') as PeriodPreset;
  const { from, to } = resolvePeriod(preset, new Date());
  return {
    filter: { legalEntityId: entity || undefined, from, to },
    preset,
    entityId: entity,
    setPreset: setPeriod,
    setEntity,
  };
}

export interface DashboardFilterBarViewProps {
  preset: string;
  onPresetChange: (value: string) => void;
  entityId: string;
  onEntityChange: (value: string) => void;
  entities: { value: string; label: string }[];
  onReload: () => void;
  isLoading: boolean;
  queryKey?: readonly unknown[];
}

export function DashboardFilterBarView({
  preset,
  onPresetChange,
  entityId,
  onEntityChange,
  entities,
  onReload,
  isLoading,
  queryKey,
}: DashboardFilterBarViewProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SegmentedControl aria-label="Period" options={PERIOD_OPTIONS} value={preset} onValueChange={onPresetChange} />
      <EntitySelect
        value={entityId}
        onValueChange={onEntityChange}
        options={[{ value: '', label: 'All entities' }, ...entities]}
        placeholder="All entities"
        searchPlaceholder="Search entity…"
        className="w-48"
      />
      <Button size="sm" variant="secondary" onClick={onReload} disabled={isLoading}>
        Reload
      </Button>
      {queryKey && <LastUpdated queryKey={queryKey} />}
    </div>
  );
}

/** Bar terhubung: memuat daftar legal entity dan mengikat state URL. */
export function DashboardFilterBar({ queryKey }: { queryKey?: readonly unknown[] }) {
  const { preset, entityId, setPreset, setEntity } = useDashboardFilter();
  const entities = useLegalEntities({ page: 1, pageSize: 200 });
  const [health, setHealth] = useUrlFilter('health');
  const [bucket, setBucket] = useUrlFilter('bucket');

  const chips = activeFilters({ period: preset, entity: entityId, health, bucket });
  const clear = (key: string) => {
    if (key === 'entity') setEntity('');
    else if (key === 'health') setHealth('');
    else if (key === 'bucket') setBucket('');
  };

  return (
    <div className="flex flex-col gap-2">
      <DashboardFilterBarView
        preset={preset}
        onPresetChange={setPreset}
        entityId={entityId}
        onEntityChange={setEntity}
        entities={(entities.data?.items ?? []).map((e) => ({ value: e.id, label: `${e.code} · ${e.legalName}` }))}
        onReload={() => entities.refetch()}
        isLoading={entities.isLoading}
        queryKey={queryKey}
      />
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <FilterChip key={c.key} label={c.label} onRemove={() => clear(c.key)} />
          ))}
        </div>
      )}
    </div>
  );
}
