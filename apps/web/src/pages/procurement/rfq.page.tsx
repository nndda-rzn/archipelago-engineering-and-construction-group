import { useState } from 'react';
import { Badge, Button, ConfirmActionButton, Input, StatusBadge } from '@aec/ui';
import { useCreateQuote, useEvaluateRfq, useRfqs, useSendRfq, type Rfq } from '@/features/procurement';
import { RfqForm } from '@/features/procurement';
import { formatDate, formatIdr as fmt } from '@/shared/lib/format';

function RfqActions({ rfq }: { rfq: Rfq }) {
  const send = useSendRfq();
  const evaluate = useEvaluateRfq();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [vendor, setVendor] = useState('');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const createQuote = useCreateQuote();

  if (rfq.status === 'DRAFT') {
    return <ConfirmActionButton size="sm" variant="secondary" confirmTitle="Kirim RFQ" confirmDescription={`Kirim ${rfq.rfqNumber} ke vendor?`} confirmLabel="Kirim" onConfirm={() => send.mutate(rfq.id)} loading={send.isPending}>Kirim</ConfirmActionButton>;
  }
  if (rfq.status === 'SENT' || rfq.status === 'QUOTED') {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setQuoteOpen((o) => !o)}>{quoteOpen ? 'Tutup' : '+ Quote'}</Button>
          {rfq.quotes.length > 0 && <ConfirmActionButton size="sm" confirmTitle="Evaluasi quote" confirmDescription="Pemenang = harga terendah." confirmLabel="Evaluasi" onConfirm={() => evaluate.mutate(rfq.id)} loading={evaluate.isPending}>Evaluasi</ConfirmActionButton>}
        </div>
        {quoteOpen && (
          <div className="w-80 rounded-md border border-neutral-200 bg-white p-3">
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Nama vendor" className="h-8 w-full" />
            <div className="mt-2 space-y-1.5">
              {rfq.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-body-sm">
                  <span className="text-caption text-neutral-600">{item.description} × {item.quantity} {item.unit}</span>
                  <Input type="number" min={0} placeholder="Harga unit" value={prices[item.id] ?? ''} onChange={(e) => setPrices((prev) => ({ ...prev, [item.id]: e.target.value }))} className="h-8 w-32 text-right" aria-label={`Harga ${item.description}`} />
                </div>
              ))}
            </div>
            <Button size="sm" className="mt-2 w-full" onClick={() => { const items = rfq.items.map((item) => ({ rfqItemId: item.id, unitPrice: Number(prices[item.id] ?? 0) })).filter((i) => i.unitPrice > 0); if (!vendor || items.length === 0) return; createQuote.mutate({ rfqId: rfq.id, input: { vendor, items } }, { onSuccess: () => { setQuoteOpen(false); setVendor(''); setPrices({}); } }); }} loading={createQuote.isPending}>Simpan Quote</Button>
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
          <div className="flex items-center justify-between"><span className="font-medium text-neutral-800">{q.vendor}</span>{q.isWinner && <Badge variant="success">Pemenang</Badge>}</div>
          <div className="mt-1 flex justify-between text-caption text-neutral-500"><span>{fmt(Number(q.totalAmount))}</span>{q.leadTimeDays ? <span>{q.leadTimeDays} hari</span> : null}</div>
        </div>
      ))}
    </div>
  );
}

export function RfqPage() {
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isError, refetch } = useRfqs({ page: 1, pageSize: 100 });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-h1 text-neutral-950">RFQ</h1><p className="mt-1 text-body-sm text-neutral-500">Request for Quotation + evaluasi vendor (FR-PRO-003/004)</p></div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Tutup' : '+ Buat RFQ'}</Button>
      </div>
      {showForm && <RfqForm onDone={() => setShowForm(false)} />}
      <div className="space-y-3">
        {isLoading && <p className="text-body-sm text-neutral-500">Memuat…</p>}
        {isError && <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-white p-4"><p className="text-body-sm text-destructive-600">Gagal memuat RFQ.</p><Button size="sm" variant="secondary" onClick={() => refetch()}>Ulangi</Button></div>}
        {!isLoading && !isError && (data?.items ?? []).map((rfq) => (
          <div key={rfq.id} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2"><span className="font-mono text-body font-semibold text-neutral-900">{rfq.rfqNumber}</span><StatusBadge status={rfq.status} /></div>
                <p className="mt-0.5 text-body text-neutral-700">{rfq.title}</p>
                <p className="text-caption text-neutral-500">{rfq.project?.code} · {rfq.items.length} item{rfq.dueDate ? ` · batas ${formatDate(rfq.dueDate)}` : ''}</p>
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