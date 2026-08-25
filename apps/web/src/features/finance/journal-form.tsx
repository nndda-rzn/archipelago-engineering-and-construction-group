import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useChartOfAccounts, useCreateJournal } from './finance.api';

type Line = { accountId: string; debit: number; credit: number; description?: string };

export function JournalForm({ onDone, entityId }: { onDone: () => void; entityId: string }) {
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const { data: accounts } = useChartOfAccounts({ legalEntityId: entityId });
  const create = useCreateJournal();

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  const addLine = () => setLines((prev) => [...prev, { accountId: '', debit: 0, credit: 0 }]);
  const updateLine = (index: number, patch: Partial<Line>) => setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));

  const onSubmit = () => {
    if (!description || !balanced) return;
    const validLines = lines.filter((l) => l.accountId && ((l.debit || 0) > 0 || (l.credit || 0) > 0));
    if (validLines.length === 0) return;
    create.mutate(
      { legalEntityId: entityId, description, reference: reference || undefined, lines: validLines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit, description: l.description || undefined })) },
      { onSuccess: () => { setDescription(''); setReference(''); setLines([]); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="jrn-desc">Deskripsi</Label>
          <Input id="jrn-desc" placeholder="mis. Biaya operasional bulanan" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="jrn-ref">Referensi (opsional)</Label>
          <Input id="jrn-ref" placeholder="No. dokumen" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Akun</th>
              <th className="px-3 py-2">Deskripsi Line</th>
              <th className="px-3 py-2 text-right">Debit</th>
              <th className="px-3 py-2 text-right">Kredit</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-t border-neutral-100">
                <td className="px-3 py-2">
                  <select value={line.accountId} onChange={(e) => updateLine(index, { accountId: e.target.value })} className="h-8 w-48 rounded-md border border-neutral-200 bg-white px-2 text-body focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
                    <option value="">Pilih akun…</option>
                    {(accounts ?? []).map((acc) => <option key={acc.id} value={acc.id}>{acc.code} — {acc.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2"><Input value={line.description ?? ''} placeholder="opsional" onChange={(e) => updateLine(index, { description: e.target.value })} className="h-8 w-44" /></td>
                <td className="px-3 py-2"><Input type="number" min={0} value={line.debit || ''} placeholder="0" onChange={(e) => updateLine(index, { debit: Number(e.target.value), credit: line.credit > 0 && Number(e.target.value) > 0 ? 0 : line.credit })} className="h-8 w-28 text-right" /></td>
                <td className="px-3 py-2"><Input type="number" min={0} value={line.credit || ''} placeholder="0" onChange={(e) => updateLine(index, { credit: Number(e.target.value), debit: line.debit > 0 && Number(e.target.value) > 0 ? 0 : line.debit })} className="h-8 w-28 text-right" /></td>
                <td className="px-3 py-2 text-right"><Button type="button" variant="ghost" size="sm" onClick={() => removeLine(index)}>Hapus</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {lines.length === 0 && <p className="p-3 text-caption text-neutral-500">Belum ada line. Tambahkan akun debit/kredit.</p>}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-6 text-body-sm">
          <span className="text-neutral-600">Total Debit: <span className="font-mono tabular-nums">{new Intl.NumberFormat('id-ID').format(totalDebit)}</span></span>
          <span className="text-neutral-600">Total Kredit: <span className="font-mono tabular-nums">{new Intl.NumberFormat('id-ID').format(totalCredit)}</span></span>
          {lines.length > 0 && (<span className={balanced ? 'text-semantic-success' : 'text-destructive-600'}>{balanced ? 'Balance ✓' : 'Belum balance'}</span>)}
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={addLine}>+ Tambah Line</Button>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending} disabled={!balanced}>Simpan Journal DRAFT</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal: journal harus balance, akun valid & aktif.</p>}
    </div>
  );
}