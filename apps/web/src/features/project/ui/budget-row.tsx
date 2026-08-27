import { useState } from 'react';
import { Button } from '@aec/ui';

export function BudgetRow({
  code,
  name,
  amount,
  depth,
  onSave,
  saving,
}: {
  code: string;
  name: string;
  amount: number;
  depth: number;
  onSave: (amount: number) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(amount > 0 ? String(amount) : '');
  const [touched, setTouched] = useState(false);

  const handleSave = () => {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) onSave(parsed);
  };

  return (
    <div
      className="flex items-center gap-3 border-b border-neutral-100 py-2 hover:bg-neutral-50"
      style={{ paddingLeft: `${depth * 24 + 16}px` }}
    >
      <span className="w-16 shrink-0 font-mono text-body-sm text-neutral-700">{code}</span>
      <span className="min-w-0 flex-1 truncate text-body-sm text-neutral-900">{name}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        placeholder="0"
        aria-label={`Budget ${code}`}
        onChange={(e) => {
          setValue(e.target.value);
          setTouched(true);
        }}
        className="h-8 w-36 rounded-md border border-neutral-200 bg-white px-2 font-mono text-body-sm text-neutral-900 placeholder:text-neutral-400 hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
      />
      <Button size="sm" variant="secondary" onClick={handleSave} disabled={saving || !touched || value === String(amount)}>
        {saving ? 'Menyimpan…' : 'Simpan'}
      </Button>
    </div>
  );
}
