import { Button, EntitySelect, FilterChip, SegmentedControl } from '@aec/ui';
import { useLegalEntities } from '@/entities/legal-entity';
import { useUrlFilter } from '@/shared/lib/use-url-state';
import { resolvePeriod, type DashboardFilter, type PeriodPreset } from '@/shared/lib/dashboard-period';

const PERIOD_OPTIONS = [
  { value: 'MTD', label: 'MTD' },
  { value: 'QTD', label: 'QTD' },
  { value: 'YTD', label: 'YTD' },
  { value: '12M', label: '12M' },
];

/**
 * Scope analitis di URL. Menyatukan entity + periode + metrik/dimensi terpilih +
 * toggle bandingkan-periode-lalu, supaya seluruh halaman dapat dibagikan lewat
 * tautan (`?entity=&period=&metric=&dimension=&compare=`).
 */
export function useAnalyticsScope(): {
  filter: DashboardFilter;
  preset: PeriodPreset;
  entityId: string;
  setPreset: (value: string) => void;
  setEntity: (value: string) => void;
  metric: string;
  setMetric: (value: string) => void;
  dimension: string;
  setDimension: (value: string) => void;
  compare: boolean;
  setCompare: (value: boolean) => void;
} {
  const [period, setPreset] = useUrlFilter('period', 'YTD');
  const [entity, setEntity] = useUrlFilter('entity');
  const [metric, setMetric] = useUrlFilter('metric', 'cashIn');
  const [dimension, setDimension] = useUrlFilter('dimension', 'project');
  const [compareRaw, setCompareRaw] = useUrlFilter('compare');

  const preset = (period || 'YTD') as PeriodPreset;
  const { from, to } = resolvePeriod(preset, new Date());

  return {
    filter: { legalEntityId: entity || undefined, from, to },
    preset,
    entityId: entity,
    setPreset,
    setEntity,
    metric: metric || 'cashIn',
    setMetric,
    dimension: dimension || 'project',
    setDimension,
    compare: compareRaw === 'previous',
    setCompare: (value: boolean) => setCompareRaw(value ? 'previous' : ''),
  };
}

export interface ScopeBarViewProps {
  preset: string;
  onPresetChange: (value: string) => void;
  entityId: string;
  onEntityChange: (value: string) => void;
  entities: { value: string; label: string }[];
  compare: boolean;
  onCompareChange: (value: boolean) => void;
  chips: { key: string; label: string }[];
  onClearChip: (key: string) => void;
}

/** Bar scope presentational: periode + entity + toggle compare + chip aktif. */
export function ScopeBarView({
  preset,
  onPresetChange,
  entityId,
  onEntityChange,
  entities,
  compare,
  onCompareChange,
  chips,
  onClearChip,
}: ScopeBarViewProps) {
  return (
    <div className="flex flex-col gap-2">
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
        <Button
          size="sm"
          variant={compare ? 'primary' : 'secondary'}
          aria-pressed={compare}
          onClick={() => onCompareChange(!compare)}
        >
          Compare vs previous
        </Button>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <FilterChip key={c.key} label={c.label} onRemove={() => onClearChip(c.key)} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Bar scope terhubung: memuat legal entity dan mengikat state URL. */
export function ScopeBar() {
  const { preset, entityId, setPreset, setEntity, compare, setCompare } = useAnalyticsScope();
  const entities = useLegalEntities({ page: 1, pageSize: 200 });

  const chips: { key: string; label: string }[] = [];
  if (entityId) {
    const label = entities.data?.items.find((e) => e.id === entityId)?.code ?? entityId;
    chips.push({ key: 'entity', label: `Entity: ${label}` });
  }
  if (compare) chips.push({ key: 'compare', label: 'Compare: vs previous' });

  const clear = (key: string) => {
    if (key === 'entity') setEntity('');
    else if (key === 'compare') setCompare(false);
  };

  return (
    <ScopeBarView
      preset={preset}
      onPresetChange={setPreset}
      entityId={entityId}
      onEntityChange={setEntity}
      entities={(entities.data?.items ?? []).map((e) => ({ value: e.id, label: `${e.code} · ${e.legalName}` }))}
      compare={compare}
      onCompareChange={setCompare}
      chips={chips}
      onClearChip={clear}
    />
  );
}
