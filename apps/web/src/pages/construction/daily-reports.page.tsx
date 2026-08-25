import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { formatIdr } from '@/shared/lib/format';
import { useDailyReports, useCreateDailyReport, type DailyReport } from '@/features/construction';

const PAGE_SIZE = 20;

const weatherLabel: Record<string, string> = {
  CERAH: 'Cerah',
  BERAWAN: 'Berawan',
  MENDUNG: 'Mendung',
  HUJAN: 'Hujan',
};

const columnHelper = createColumnHelper<DailyReport>();

const columns = [
  columnHelper.accessor('drNumber', { header: 'Nomor', cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()}</span> }),
  columnHelper.accessor('reportDate', {
    header: 'Tanggal',
    cell: (info) => new Date(info.getValue()).toLocaleDateString('id-ID'),
  }),
  columnHelper.accessor('weather', {
    header: 'Cuaca',
    cell: (info) => (info.getValue() ? weatherLabel[info.getValue() as string] ?? info.getValue() : '—'),
  }),
  columnHelper.accessor('manpowerTotal', {
    header: 'Manpower',
    cell: (info) => <span className="font-mono tabular-nums">{info.getValue()}</span>,
  }),
  columnHelper.accessor('summary', {
    header: 'Ringkasan',
    cell: (info) => <span className="line-clamp-1 max-w-md">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'SUBMITTED' ? 'success' : 'default'}>{info.getValue()}</Badge>,
  }),
];

type ManpowerLine = { trade: string; count: string; hours: string };

function CreateDailyReportForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [weather, setWeather] = useState('CERAH');
  const [summary, setSummary] = useState('');
  const [issues, setIssues] = useState('');
  const [hseNote, setHseNote] = useState('');
  const [equipmentList, setEquipmentList] = useState('');
  const [materialList, setMaterialList] = useState('');
  const [lines, setLines] = useState<ManpowerLine[]>([{ trade: 'KONSTRUKSI', count: '', hours: '' }]);
  const create = useCreateDailyReport(projectId);

  const updateLine = (i: number, field: keyof ManpowerLine, value: string) => {
    setLines(lines.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  };

  const submit = () => {
    const manpowerLines = lines
      .filter((l) => l.trade && l.count)
      .map((l) => ({
        trade: l.trade,
        manpowerCount: Number(l.count),
        hoursWorked: Number(l.hours) || 0,
      }));
    if (!summary.trim()) return;
    create.mutate(
      {
        reportDate,
        weather,
        summary,
        issues: issues || undefined,
        hseNote: hseNote || undefined,
        equipmentList: equipmentList || undefined,
        materialList: materialList || undefined,
        manpowerLines,
      },
      { onSuccess: onDone },
    );
  };

  return (
    <div className="space-y-3 rounded-md border border-neutral-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <Label htmlFor="dr-date">Tanggal</Label>
          <Input id="dr-date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="dr-weather">Cuaca</Label>
          <select id="dr-weather" value={weather} onChange={(e) => setWeather(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-body-sm">
            <option value="CERAH">Cerah</option>
            <option value="BERAWAN">Berawan</option>
            <option value="MENDUNG">Mendung</option>
            <option value="HUJAN">Hujan</option>
          </select>
        </div>
        <div>
          <Label>Manpower (baris)</Label>
          <Button size="sm" variant="secondary" onClick={() => setLines([...lines, { trade: '', count: '', hours: '' }])}>+ Tambah</Button>
        </div>
      </div>

      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <Label>Trade</Label>
            <Input value={l.trade} onChange={(e) => updateLine(i, 'trade', e.target.value)} placeholder="KONSTRUKSI" />
          </div>
          <div>
            <Label>Jumlah</Label>
            <Input type="number" min={1} value={l.count} onChange={(e) => updateLine(i, 'count', e.target.value)} placeholder="10" />
          </div>
          <div>
            <Label>Jam Kerja</Label>
            <Input type="number" min={0} max={24} value={l.hours} onChange={(e) => updateLine(i, 'hours', e.target.value)} placeholder="8" />
          </div>
          <div className="flex items-end">
            {lines.length > 1 && (
              <Button size="sm" variant="secondary" onClick={() => setLines(lines.filter((_, idx) => idx !== i))}>Hapus</Button>
            )}
          </div>
        </div>
      ))}

      <div>
        <Label htmlFor="dr-summary">Ringkasan Aktivitas</Label>
        <textarea
          id="dr-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-body-sm"
          placeholder="Aktivitas utama hari ini…"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="dr-issues">Masalah Lapangan</Label>
          <Input id="dr-issues" value={issues} onChange={(e) => setIssues(e.target.value)} placeholder="Opsional" />
        </div>
        <div>
          <Label htmlFor="dr-hse">Catatan HSE</Label>
          <Input id="dr-hse" value={hseNote} onChange={(e) => setHseNote(e.target.value)} placeholder="Opsional" />
        </div>
        <div>
          <Label htmlFor="dr-equip">Equipment</Label>
          <Input id="dr-equip" value={equipmentList} onChange={(e) => setEquipmentList(e.target.value)} placeholder="Opsional" />
        </div>
        <div>
          <Label htmlFor="dr-mat">Material</Label>
          <Input id="dr-mat" value={materialList} onChange={(e) => setMaterialList(e.target.value)} placeholder="Opsional" />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onDone}>Batal</Button>
        <Button size="sm" onClick={submit} disabled={create.isPending || !summary.trim()}>
          {create.isPending ? 'Menyimpan…' : 'Submit Daily Report'}
        </Button>
      </div>
      {create.isError && <p className="text-body-sm text-destructive-600">Gagal menyimpan daily report.</p>}
    </div>
  );
}

export function DailyReportsPage() {
  const [projectId, setProjectId] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const { data: projects } = useProjects({ page: 1, pageSize: 100 });
  const { data, isLoading, isError, refetch } = useDailyReports(projectId, { page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Daily Report</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Laporan harian lapangan konstruksi (FR-CON-003)</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }}
            className="rounded-md border border-neutral-300 px-3 py-2 text-body-sm"
          >
            <option value="">Pilih Project…</option>
            {projects?.items.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
          {projectId && <Button size="sm" onClick={() => setShowForm(true)} disabled={showForm}>+ Daily Report</Button>}
        </div>
      </div>

      {showForm && projectId && (
        <div className="mb-6">
          <CreateDailyReportForm projectId={projectId} onDone={() => setShowForm(false)} />
        </div>
      )}

      {!projectId && <p className="text-body-sm text-neutral-500">Pilih project untuk melihat daily reports.</p>}

      {projectId && (
        <DataGrid
          columns={columns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
        />
      )}
    </div>
  );
}
