import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useWorkPackages } from '@/features/construction';
import {
  useItps, useCreateItp, useInspections, useCreateInspection, useInspect,
  useNcrs, useCreateNcr, useDisposeNcr, useReinspectNcr,
  usePunchItems, useCreatePunchItem, useClosePunchItem,
  type Itp, type InspectionRequest, type Ncr, type PunchListItem,
} from '@/features/quality';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  OPEN: 'warning',
  PASS: 'success',
  FAIL: 'warning',
  CLOSED: 'success',
  DISPOSED: 'success',
  DRAFT: 'default',
};

const itpHelper = createColumnHelper<Itp>();
const insHelper = createColumnHelper<InspectionRequest>();
const ncrHelper = createColumnHelper<Ncr>();
const punchHelper = createColumnHelper<PunchListItem>();

const itpColumns = [
  itpHelper.accessor('itpNumber', {
    header: 'No. ITP',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  itpHelper.accessor('title', {
    header: 'Judul',
    cell: (info) => <span className="text-neutral-800">{info.getValue()}</span>,
  }),
  itpHelper.accessor('workPackage', {
    header: 'Work Package',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()?.wpNumber ?? '—'}</span>,
  }),
  itpHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
];

const insColumns = [
  insHelper.accessor('inspectionNumber', {
    header: 'No. Inspeksi',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  insHelper.accessor('description', {
    header: 'Deskripsi',
    cell: (info) => <span className="max-w-sm truncate text-neutral-700">{info.getValue()}</span>,
  }),
  insHelper.accessor('result', {
    header: 'Hasil',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  insHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  insHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <InspectButtons inspection={row.original} />,
  }),
];

function InspectButtons({ inspection }: { inspection: InspectionRequest }) {
  const inspect = useInspect();
  if (inspection.status === 'CLOSED') return null;
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="secondary" loading={inspect.isPending} onClick={() => inspect.mutate({ id: inspection.id, result: 'PASS' })}>
        PASS
      </Button>
      <Button size="sm" variant="ghost" loading={inspect.isPending} onClick={() => inspect.mutate({ id: inspection.id, result: 'FAIL' })}>
        FAIL
      </Button>
    </div>
  );
}

const ncrColumns = [
  ncrHelper.accessor('ncrNumber', {
    header: 'No. NCR',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  ncrHelper.accessor('severity', {
    header: 'Severity',
    cell: (info) => <Badge variant={info.getValue() === 'CRITICAL' ? 'warning' : info.getValue() === 'MAJOR' ? 'warning' : 'default'}>{info.getValue()}</Badge>,
  }),
  ncrHelper.accessor('category', {
    header: 'Kategori',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  ncrHelper.accessor('description', {
    header: 'Deskripsi',
    cell: (info) => <span className="max-w-xs truncate text-neutral-700">{info.getValue()}</span>,
  }),
  ncrHelper.accessor('reinspectionResult', {
    header: 'Re-inspeksi',
    cell: (info) => (info.getValue() ? <Badge variant={info.getValue() === 'PASS' ? 'success' : 'warning'}>{info.getValue()}</Badge> : '—'),
  }),
  ncrHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  ncrHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <NcrActions ncr={row.original} />,
  }),
];

function NcrActions({ ncr }: { ncr: Ncr }) {
  const dispose = useDisposeNcr();
  const reinspect = useReinspectNcr();
  const [rootCause, setRootCause] = useState('');
  const [action, setAction] = useState('');
  if (ncr.status === 'CLOSED') return null;
  return (
    <div className="flex items-center gap-1">
      {ncr.status === 'OPEN' ? (
        <>
          <Input placeholder="Root cause" value={rootCause} onChange={(e) => setRootCause(e.target.value)} className="h-8 w-32" />
          <Button size="sm" variant="secondary" disabled={!rootCause} loading={dispose.isPending} onClick={() => dispose.mutate({ id: ncr.id, rootCause, correctiveAction: action || undefined })}>
            Dispose
          </Button>
        </>
      ) : null}
      {ncr.status === 'UNDER_REVIEW' ? (
        <>
          <Input placeholder="Tindakan" value={action} onChange={(e) => setAction(e.target.value)} className="h-8 w-32" />
          <Button size="sm" variant="secondary" loading={reinspect.isPending} onClick={() => reinspect.mutate({ id: ncr.id, result: 'PASS' })}>
            Re-inspeksi PASS
          </Button>
          <Button size="sm" variant="ghost" loading={reinspect.isPending} onClick={() => reinspect.mutate({ id: ncr.id, result: 'FAIL' })}>
            FAIL
          </Button>
        </>
      ) : null}
    </div>
  );
}

const punchColumns = [
  punchHelper.accessor('punchNumber', {
    header: 'No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  punchHelper.accessor('description', {
    header: 'Deskripsi',
    cell: (info) => <span className="max-w-sm truncate text-neutral-700">{info.getValue()}</span>,
  }),
  punchHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'CLOSED' ? 'success' : 'warning'}>{info.getValue()}</Badge>,
  }),
  punchHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const close = useClosePunchItem();
      if (row.original.status === 'CLOSED') return null;
      return (
        <Button size="sm" variant="secondary" loading={close.isPending} onClick={() => close.mutate({ id: row.original.id })}>
          Tutup
        </Button>
      );
    },
  }),
];

function useProjectOptions() {
  const [projectId, setProjectId] = useState('');
  const projects = useProjects({ page: 1, pageSize: 100 });
  const { data: workPackages } = useWorkPackages(projectId, { page: 1, pageSize: 100 });
  return { projectId, setProjectId, projects, workPackages };
}

function ProjectSelect({ projectId, setProjectId }: { projectId: string; setProjectId: (v: string) => void }) {
  const { projects } = useProjectOptions();
  return (
    <div>
      <Label htmlFor="qp-project">Project</Label>
      <select
        id="qp-project"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body"
      >
        <option value="">Pilih project…</option>
        {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
      </select>
    </div>
  );
}

function ItpForm({ onDone }: { onDone: () => void }) {
  const { projectId, setProjectId, workPackages } = useProjectOptions();
  const [title, setTitle] = useState('');
  const [wpId, setWpId] = useState('');
  const create = useCreateItp();
  const onSubmit = () => {
    if (!title) return;
    create.mutate({ workPackageId: wpId || undefined, title }, { onSuccess: () => { setTitle(''); setWpId(''); onDone(); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <ProjectSelect projectId={projectId} setProjectId={setProjectId} />
        <div>
          <Label htmlFor="itp-wp">Work Package</Label>
          <select
            id="itp-wp"
            value={wpId}
            onChange={(e) => setWpId(e.target.value)}
            disabled={!projectId}
            className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body disabled:bg-neutral-50"
          >
            <option value="">Tanpa WP</option>
            {(workPackages?.items ?? []).map((w) => <option key={w.id} value={w.id}>{w.wpNumber} — {w.title}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="itp-title">Judul ITP</Label>
          <Input id="itp-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat ITP</Button>
      </div>
    </div>
  );
}

function InspectionForm({ onDone }: { onDone: () => void }) {
  const { projectId, setProjectId, workPackages } = useProjectOptions();
  const [description, setDescription] = useState('');
  const [wpId, setWpId] = useState('');
  const create = useCreateInspection();
  const onSubmit = () => {
    if (!description) return;
    create.mutate({ workPackageId: wpId || undefined, description }, { onSuccess: () => { setDescription(''); setWpId(''); onDone(); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <ProjectSelect projectId={projectId} setProjectId={setProjectId} />
        <div>
          <Label htmlFor="ins-wp">Work Package</Label>
          <select
            id="ins-wp"
            value={wpId}
            onChange={(e) => setWpId(e.target.value)}
            disabled={!projectId}
            className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body disabled:bg-neutral-50"
          >
            <option value="">Tanpa WP</option>
            {(workPackages?.items ?? []).map((w) => <option key={w.id} value={w.id}>{w.wpNumber}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="ins-desc">Deskripsi Inspeksi</Label>
          <Input id="ins-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Inspeksi</Button>
      </div>
    </div>
  );
}

function NcrForm({ onDone }: { onDone: () => void }) {
  const { projectId, setProjectId, workPackages } = useProjectOptions();
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MINOR');
  const [category, setCategory] = useState('WORKMANSHIP');
  const [wpId, setWpId] = useState('');
  const create = useCreateNcr();
  const onSubmit = () => {
    if (!description) return;
    create.mutate(
      { category, severity, description, workPackageId: wpId || undefined },
      { onSuccess: () => { setDescription(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <ProjectSelect projectId={projectId} setProjectId={setProjectId} />
        <div>
          <Label htmlFor="ncr-wp">Work Package</Label>
          <select
            id="ncr-wp"
            value={wpId}
            onChange={(e) => setWpId(e.target.value)}
            disabled={!projectId}
            className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body disabled:bg-neutral-50"
          >
            <option value="">Tanpa WP</option>
            {(workPackages?.items ?? []).map((w) => <option key={w.id} value={w.id}>{w.wpNumber}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ncr-cat">Kategori</Label>
          <select id="ncr-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="WORKMANSHIP">WORKMANSHIP</option>
            <option value="MATERIAL">MATERIAL</option>
            <option value="DESIGN">DESIGN</option>
            <option value="DOCUMENT">DOCUMENT</option>
          </select>
        </div>
        <div>
          <Label htmlFor="ncr-sev">Severity</Label>
          <select id="ncr-sev" value={severity} onChange={(e) => setSeverity(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="MINOR">MINOR</option>
            <option value="MAJOR">MAJOR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="ncr-desc">Deskripsi NCR</Label>
          <Input id="ncr-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat NCR</Button>
      </div>
    </div>
  );
}

function PunchForm({ onDone }: { onDone: () => void }) {
  const { projectId, setProjectId, workPackages } = useProjectOptions();
  const [description, setDescription] = useState('');
  const [wpId, setWpId] = useState('');
  const create = useCreatePunchItem();
  const onSubmit = () => {
    if (!description) return;
    create.mutate({ description, workPackageId: wpId || undefined }, { onSuccess: () => { setDescription(''); setWpId(''); onDone(); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <ProjectSelect projectId={projectId} setProjectId={setProjectId} />
        <div>
          <Label htmlFor="punch-wp">Work Package</Label>
          <select
            id="punch-wp"
            value={wpId}
            onChange={(e) => setWpId(e.target.value)}
            disabled={!projectId}
            className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body disabled:bg-neutral-50"
          >
            <option value="">Tanpa WP</option>
            {(workPackages?.items ?? []).map((w) => <option key={w.id} value={w.id}>{w.wpNumber}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="punch-desc">Deskripsi Punch</Label>
          <Input id="punch-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Punch</Button>
      </div>
    </div>
  );
}

type Tab = 'itp' | 'inspections' | 'ncrs' | 'punch';

export function QualityPage() {
  const [tab, setTab] = useState<Tab>('itp');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const itps = useItps({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const inspections = useInspections({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const ncrs = useNcrs({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const punch = usePunchItems({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  const gridProps = { pagination, onPaginationChange: setPagination };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Quality</h1>
          <p className="mt-1 text-body-sm text-neutral-500">ITP, inspeksi, NCR, punch list (FR-QA-001..004)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat Baru'}
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        {(['itp', 'inspections', 'ncrs', 'punch'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowForm(false); }}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {t === 'itp' ? 'ITP' : t === 'inspections' ? `Inspeksi (${inspections.data?.total ?? 0})` : t === 'ncrs' ? `NCR (${ncrs.data?.total ?? 0})` : `Punch (${punch.data?.total ?? 0})`}
          </button>
        ))}
      </div>

      {showForm && tab === 'itp' && <ItpForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'inspections' && <InspectionForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'ncrs' && <NcrForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'punch' && <PunchForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        {tab === 'itp' && (
          <DataGrid
            columns={itpColumns}
            data={itps.data?.items ?? []}
            rowCount={itps.data?.total ?? 0}
            isLoading={itps.isLoading}
            isError={itps.isError}
            onRetry={() => itps.refetch()}
            emptyMessage="Belum ada ITP"
            {...gridProps}
          />
        )}
        {tab === 'inspections' && (
          <DataGrid
            columns={insColumns}
            data={inspections.data?.items ?? []}
            rowCount={inspections.data?.total ?? 0}
            isLoading={inspections.isLoading}
            isError={inspections.isError}
            onRetry={() => inspections.refetch()}
            emptyMessage="Belum ada inspeksi"
            {...gridProps}
          />
        )}
        {tab === 'ncrs' && (
          <DataGrid
            columns={ncrColumns}
            data={ncrs.data?.items ?? []}
            rowCount={ncrs.data?.total ?? 0}
            isLoading={ncrs.isLoading}
            isError={ncrs.isError}
            onRetry={() => ncrs.refetch()}
            emptyMessage="Belum ada NCR"
            {...gridProps}
          />
        )}
        {tab === 'punch' && (
          <DataGrid
            columns={punchColumns}
            data={punch.data?.items ?? []}
            rowCount={punch.data?.total ?? 0}
            isLoading={punch.isLoading}
            isError={punch.isError}
            onRetry={() => punch.refetch()}
            emptyMessage="Belum ada punch item"
            {...gridProps}
          />
        )}
      </div>
    </div>
  );
}
