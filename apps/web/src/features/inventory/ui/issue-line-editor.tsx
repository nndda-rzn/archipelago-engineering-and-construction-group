import { Button, Input } from '@aec/ui';

export type IssueLine = { description: string; quantity: number; unit: string; wbsItemId: string };
export type WbsOption = { id: string; label: string };

export function IssueLineEditor({
  lines,
  wbsOptions,
  onChange,
  onAdd,
  onRemove,
}: {
  lines: IssueLine[];
  wbsOptions: WbsOption[];
  onChange: (index: number, patch: Partial<IssueLine>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <>
      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Deskripsi</th>
              <th className="px-3 py-2">WBS</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2 text-right">Qty Keluar</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-t border-neutral-100">
                <td className="px-3 py-2">
                  <Input placeholder="Contoh: Semen 50kg" value={line.description} onChange={(e) => onChange(index, { description: e.target.value })} className="h-8" />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={line.wbsItemId}
                    onChange={(e) => onChange(index, { wbsItemId: e.target.value })}
                    className="flex h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-body hover:border-neutral-300"
                  >
                    <option value="">WBS (opsional)…</option>
                    {wbsOptions.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <Input placeholder="EA" value={line.unit} onChange={(e) => onChange(index, { unit: e.target.value })} className="h-8 w-20" />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={line.quantity || ''}
                    onChange={(e) => onChange(index, { quantity: Number(e.target.value) })}
                    className="h-8 w-28"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)} disabled={lines.length === 1}>
                    Hapus
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2">
        <Button type="button" variant="secondary" size="sm" onClick={onAdd}>+ Tambah Baris</Button>
      </div>
    </>
  );
}
