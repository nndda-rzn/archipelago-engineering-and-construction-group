import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useVendorInvoices, useCreatePayment } from '../model/finance.api';
import { formatIdr } from '@/shared/lib/format';

type PayLine = { invoiceId: string; amount: number };

export function PaymentForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [vendor, setVendor] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<PayLine[]>([]);

  const projects = useProjects({ page: 1, pageSize: 100 });
  const invoices = useVendorInvoices({ page: 1, pageSize: 100 });
  const postedInvoices = (invoices.data?.items ?? []).filter((inv) => inv.status === 'POSTED');
  const create = useCreatePayment();

  const addLine = (invoiceId: string) => {
    const invoice = postedInvoices.find((inv) => inv.id === invoiceId);
    setLines((prev) => [...prev, { invoiceId, amount: Number(invoice?.totalAmount ?? 0) }]);
  };

  const updateLine = (index: number, patch: Partial<PayLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const onSubmit = () => {
    if (!projectId || !vendor) return;
    const items = lines.filter((l) => l.amount > 0).map((l) => ({ invoiceId: l.invoiceId, amount: l.amount }));
    if (items.length === 0) return;
    create.mutate(
      { projectId, vendor, bankAccount: bankAccount || undefined, reference: reference || undefined, items },
      { onSuccess: () => { setVendor(''); setBankAccount(''); setReference(''); setLines([]); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pay-project">Project</Label>
          <Select value={projectId} onValueChange={(v) => { setProjectId(v); setLines([]); }}>
            <SelectTrigger id="pay-project"><SelectValue placeholder="Pilih project…" /></SelectTrigger>
            <SelectContent>
              {(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="pay-vendor">Vendor</Label>
          <Input id="pay-vendor" placeholder="PT Baja Utama" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="pay-bank">Rekening (opsional)</Label>
          <Input id="pay-bank" placeholder="No. rekening" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="pay-ref">Referensi (opsional)</Label>
          <Input id="pay-ref" placeholder="No. transfer" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Invoice POSTED</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Bayar</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {postedInvoices.map((inv) => {
              const line = lines.find((l) => l.invoiceId === inv.id);
              const added = !!line;
              return (
                <tr key={inv.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2 font-mono text-neutral-700">{inv.invoiceNumber}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-600">
                    {formatIdr(inv.totalAmount)}
                  </td>
                  <td className="px-3 py-2">
                    {added ? (
                      <Input type="number" min={0} step={1000} value={line?.amount || ''} onChange={(e) => updateLine(lines.indexOf(line!), { amount: Number(e.target.value) })} className="h-8 w-32 text-right" />
                    ) : (
                      <span className="text-caption text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {added ? <Button type="button" variant="ghost" size="sm" onClick={() => setLines((prev) => prev.filter((_, i) => i !== lines.indexOf(line!)))}>Batal</Button> : <Button type="button" variant="secondary" size="sm" onClick={() => addLine(inv.id)}>+ Pilih</Button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {postedInvoices.length === 0 && <p className="p-3 text-caption text-neutral-500">Tidak ada invoice POSTED.</p>}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Payment DRAFT</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal. Jumlah tidak boleh melebihi AP open.</p>}
    </div>
  );
}