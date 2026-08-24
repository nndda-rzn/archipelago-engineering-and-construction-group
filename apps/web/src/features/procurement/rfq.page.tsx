import { useState } from 'react';
import { Badge, Button, Input, Label } from '@aec/ui';
import { useProjects } from '@/features/project/project.api';
import { useCreateQuote, useCreateRfq, useEvaluateRfq, useRfqs, useSendRfq, type Rfq } from './procurement.api';

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default',
  SENT: 'default',
  QUOTED: 'warning',
  EVALUATED: 'warning',
  AWARDED: 'success',
  CANCELLED: 'warning',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

function RfqActions({ rfq }: { rfq: Rfq }) {
  const send = useSendRfq();
  const evaluate = useEvaluateRfq();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [vendor, setVendor] = useState('');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const createQuote = useCreateQuote();

  if (rfq.status === 'DRAFT') {
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          if (window.confirm(`Kirim ${rfq.rfqNumber} ke vendor?`)) send.mutate(rfq.id);
        }}
        loading={send.isPending}
      >
        Kirim
      </Button>
    );
  }

  if (rfq.status === 'SENT' || rfq.status === 'QUOTED') {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setQuoteOpen((o) => !o)}>
            {quoteOpen ? 'Tutup' : '+ Quote'}
          </Button>
          {rfq.quotes.length > 0 && (
            <Button
              size="sm"
              onClick={() => {
                if (window.confirm('Evaluasi quote? Pemenang = harga terendah.')) evaluate.mutate(rfq.id);
              }}
              loading={evaluate.isPending}
            >
              Evaluasi
            </Button>
          )}
        </div>
        {quoteOpen && (
          <div className="w-80 rounded-md border border-neutral-200 bg-white p-3">
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Nama vendor" className="h-8 w-full" />
            <div className="mt-2 space-y-1.5">
              {rfq.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-body-sm">
                  <span className="text-caption text-neutral-600">
                    {item.description} × {item.quantity} {item.unit}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Harga unit"
                    value={prices[item.id] ?? ''}
                    onChange={(e) => setPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    className="h-8 w-32 text-right"
                    aria-label={`Harga ${item.description}`}
                  />
                </div>
              ))}
            </div>
            <Button
              size="sm"
              className="mt-2 w-full"
              onClick={() => {
                const items = rfq.items
                  .map((item) => ({ rfqItemId: item.id, unitPrice: Number(prices[item.id] ?? 0) }))
                  .filter((i) => i.unitPrice > 0);
                if (!vendor || items.length === 0) return;
                createQuote.mutate(
                  { rfqId: rfq.id, input: { vendor, items } },
                  { onSuccess: () => { setQuoteOpen(false); setVendor(''); setPrices({}); } },
                );
              }}
              loading={createQuote.isPending}
            >
              Simpan Quote
            </Button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function QuoteList({ rfq }: { rfq: Rfq }) {
  if (rfq.quotes.length === 0) return null;
  return (
    <div className="mt-2 grid gap-2 md:grid-cols-2">
      {rfq.quotes.map((q) => (
        <div key={q.id} className={`rounded-md border px-3 py-2 text-body-sm ${q.isWinner ? 'border-semantic-success bg-semantic-success/5' : 'border-neutral-100'}`}>
          <div className="flex items-center justify-between">
            <span className="font-medium text-neutral-800">{q.vendor}</span>
            {q.isWinner && <Badge variant="success">Pemenang</Badge>}
          </div>
          <div className="mt-1 flex justify-between text-caption text-neutral-500">
            <span>{fmt(Number(q.totalAmount))}</span>
            {q.leadTimeDays ? <span>{q.leadTimeDays} hari</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

type RfqLine = { description: string; quantity: number; unit: string };

function RfqForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lines, setLines] = useState<RfqLine[]>([]);
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateRfq();

  const addLine = () => setLines((prev) => [...prev, { description: '', quantity: 1, unit: 'EA' }]);
  const updateLine = (index: number, patch: Partial<RfqLine>) => setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));

  const onSubmit = () => {
    if (!projectId || !title) return;
    const items = lines.filter((l) => l.description && l.quantity > 0);
    if (items.length === 0) return;
    create.mutate(
      { projectId, title, dueDate: dueDate || undefined, items },
      { onSuccess: () => { setTitle(''); setDueDate(''); setLines([]); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="rfq-project">Project</Label>
          <select
            id="rfq-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih project…</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="rfq-title">Judul</Label>
          <Input id="rfq-title" placeholder="Pengadaan material…" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Deskripsi</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-t border-neutral-100">
                <td className="px-3 py-2">
                  <Input value={line.description} placeholder="mis. Baja Profil" onChange={(e) => updateLine(index, { description: e.target.value })} className="h-8 w-full" />
                </td>
                <td className="px-3 py-2">
                  <Input type="number" min={0.01} value={line.quantity || ''} onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })} className="h-8 w-24 text-right" />
                </td>
                <td className="px-3 py-2">
                  <Input value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} className="h-8 w-20" />
                </td>
                <td className="px-3 py-2 text-right">
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(index)}>Hapus</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lines.length === 0 && <p className="p-3 text-caption text-neutral-500">Belum ada item RFQ.</p>}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <Label htmlFor="rfq-due">Batas Penawaran (opsional)</Label>
          <input
            id="rfq-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          />
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={addLine}>+ Tambah Item</Button>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat RFQ DRAFT</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat RFQ.</p>}
    </div>
  );
}

export function RfqPage() {
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isError, refetch } = useRfqs({ page: 1, pageSize: 100 });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">RFQ</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Request for Quotation + evaluasi vendor (FR-PRO-003/004)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat RFQ'}
        </Button>
      </div>

      {showForm && <RfqForm onDone={() => setShowForm(false)} />}

      <div className="space-y-3">
        {isLoading && <p className="text-body-sm text-neutral-500">Memuat…</p>}
        {isError && (
          <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-white p-4">
            <p className="text-body-sm text-destructive-600">Gagal memuat RFQ.</p>
            <Button size="sm" variant="secondary" onClick={() => refetch()}>Ulangi</Button>
          </div>
        )}
        {!isLoading && !isError && (data?.items ?? []).map((rfq) => (
          <div key={rfq.id} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-body font-semibold text-neutral-900">{rfq.rfqNumber}</span>
                  <Badge variant={statusVariant[rfq.status] ?? 'default'}>{rfq.status}</Badge>
                </div>
                <p className="mt-0.5 text-body text-neutral-700">{rfq.title}</p>
                <p className="text-caption text-neutral-500">
                  {rfq.project?.code} · {rfq.items.length} item
                  {rfq.dueDate ? ` · batas ${new Date(rfq.dueDate).toLocaleDateString('id-ID')}` : ''}
                </p>
              </div>
              <RfqActions rfq={rfq} />
            </div>
            <QuoteList rfq={rfq} />
          </div>
        ))}
        {!isLoading && !isError && data?.items.length === 0 && <p className="text-body-sm text-neutral-500">Belum ada RFQ.</p>}
      </div>
    </div>
  );
}
