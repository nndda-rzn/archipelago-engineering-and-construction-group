import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import {
  useHandovers,
  useCreateHandover,
  useSubmitHandover,
  useVerifyHandoverItem,
  useApproveHandover,
  type HandoverPackage,
} from '@/features/construction';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'warning' | 'success'> = {
  DRAFT: 'default',
  SUBMITTED: 'warning',
  APPROVED: 'success',
  COMPLETED: 'success',
};

const statusLabel: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Diajukan',
  APPROVED: 'Disetujui',
  COMPLETED: 'Selesai',
};

const columnHelper = createColumnHelper<HandoverPackage>();

const columns = [
  columnHelper.accessor('hoNumber', { header: 'Nomor', cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()}</span> }),
  columnHelper.accessor('title', { header: 'Judul' }),
  columnHelper.accessor('handoverDate', {
    header: 'Tanggal',
    cell: (info) => (info.getValue() ? new Date(info.getValue() as string).toLocaleDateString('id-ID') : '—'),
  }),
  columnHelper.accessor('items', {
    header: 'Dokumen',
    cell: (info) => {
      const items = info.getValue();
      const verified = items.filter((i) => i.status === 'VERIFIED').length;
      return <span className="font-mono tabular-nums text-xs">{verified}/{items.length} verified</span>;
    },
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{statusLabel[info.getValue()] ?? info.getValue()}</Badge>,
  }),
];

export function HandoverPage() {
  const [projectId, setProjectId] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<HandoverPackage | null>(null);
  const { data: projects } = useProjects({ page: 1, pageSize: 100 });
  const { data, isLoading, isError, refetch } = useHandovers(projectId, { page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const create = useCreateHandover(projectId);
  const submit = useSubmitHandover(projectId);
  const verify = useVerifyHandoverItem(projectId);
  const approve = useApproveHandover(projectId);

  // Form state
  const [title, setTitle] = useState('');
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().slice(0, 10));
  const [checklist, setChecklist] = useState('');
  const [docName, setDocName] = useState('');
  const [docNames, setDocNames] = useState<string[]>(['As-Built Drawing', 'Test Certificate']);

  const submitForm = () => {
    if (!title.trim()) return;
    create.mutate(
      { title, handoverDate, checklist: checklist || undefined, items: docNames.map((d) => ({ documentName: d })) },
      { onSuccess: () => { setShowForm(false); setTitle(''); setDocNames(['As-Built Drawing', 'Test Certificate']); } },
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Handover</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Serah terima & closeout — cek dokumen mandatory (FR-CON-006)</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); setSelected(null); }}
            className="rounded-md border border-neutral-300 px-3 py-2 text-body-sm"
          >
            <option value="">Pilih Project…</option>
            {projects?.items.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
          {projectId && <Button size="sm" onClick={() => setShowForm(true)} disabled={showForm}>+ Handover</Button>}
        </div>
      </div>

      {showForm && projectId && (
        <div className="mb-6 space-y-3 rounded-md border border-neutral-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label>Judul</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Handover Area A" />
            </div>
            <div>
              <Label>Tanggal</Label>
              <Input type="date" value={handoverDate} onChange={(e) => setHandoverDate(e.target.value)} />
            </div>
            <div>
              <Label>Checklist</Label>
              <Input value={checklist} onChange={(e) => setChecklist(e.target.value)} placeholder="Opsional" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Dokumen</Label>
            {docNames.map((d, i) => (
              <div key={i} className="flex gap-2">
                <Input value={d} onChange={(e) => setDocNames(docNames.map((x, idx) => (idx === i ? e.target.value : x)))} />
                <Button size="sm" variant="secondary" onClick={() => setDocNames(docNames.filter((_, idx) => idx !== i))}>Hapus</Button>
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={() => setDocNames([...docNames, ''])}>+ Dokumen</Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
            <Button size="sm" onClick={submitForm} disabled={create.isPending || !title.trim()}>{create.isPending ? 'Menyimpan…' : 'Buat Handover'}</Button>
          </div>
        </div>
      )}

      {!projectId && <p className="text-body-sm text-neutral-500">Pilih project untuk melihat handover.</p>}

      {projectId && (
        <>
          <DataGrid
            columns={columns}
            data={data?.items ?? []}
            rowCount={data?.total ?? 0}
            pagination={pagination}
            onPaginationChange={setPagination}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            onRowClick={(row) => setSelected(row.original as HandoverPackage)}
          />
          <p className="mt-2 text-caption text-neutral-500">Klik baris untuk detail & verifikasi dokumen.</p>
        </>
      )}

      {selected && (
        <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-h3 text-neutral-800">{selected.title}</h2>
              <p className="font-mono text-caption text-neutral-500">{selected.hoNumber} · {statusLabel[selected.status] ?? selected.status}</p>
            </div>
            <div className="flex gap-2">
              {selected.status === 'DRAFT' && (
                <Button size="sm" onClick={() => submit.mutate(selected.id)} disabled={submit.isPending}>Submit</Button>
              )}
              {selected.status === 'SUBMITTED' && (
                <Button size="sm" onClick={() => approve.mutate(selected.id)} disabled={approve.isPending || selected.items.some((i) => i.status !== 'VERIFIED')}>
                  Approve
                </Button>
              )}
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {selected.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border border-neutral-100 px-3 py-2">
                <div>
                  <span className="text-body-sm text-neutral-800">{item.documentName}</span>
                  {item.isMandatory && <Badge variant="warning" className="ml-2">Mandatory</Badge>}
                  <Badge variant={item.status === 'VERIFIED' ? 'success' : 'default'} className="ml-2">{item.status}</Badge>
                </div>
                {item.status !== 'VERIFIED' && (
                  <Button size="sm" variant="secondary" onClick={() => verify.mutate({ id: selected.id, itemId: item.id })} disabled={verify.isPending}>
                    Verifikasi
                  </Button>
                )}
              </div>
            ))}
          </div>
          {approve.isError && <p className="mt-2 text-body-sm text-destructive-600">Semua dokumen harus VERIFIED sebelum approve.</p>}
        </div>
      )}
    </div>
  );
}
