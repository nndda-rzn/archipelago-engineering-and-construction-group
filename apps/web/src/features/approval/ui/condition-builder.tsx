import { Plus, X } from 'lucide-react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import type { ConditionGroup } from '@aec/api-contracts';
import { conditionFieldLabel, conditionFieldsFor, opLabel } from './workflow-labels';

/** Bentuk nilai yang diedit builder: grup, atau `null` bila langkah tanpa syarat. */
export type ConditionValue = ConditionGroup | null;

export interface ConditionBuilderProps {
  /** Jenis transaksi dokumen — menentukan field yang tersedia. */
  transactionType: string;
  value: ConditionValue;
  onChange: (next: ConditionValue) => void;
  /** `id` prefix agar label ↔ kontrol tetap terhubung saat dipakai berulang. */
  idPrefix: string;
  disabled?: boolean;
}

const OPERATORS = ['>', '>=', '<', '<=', '=='] as const;

/**
 * Syarat langkah dibangun dari daftar tertutup, bukan teks bebas. Alasannya
 * nyata: field yang salah ketik (mis. `total`) tidak pernah cocok dengan nilai
 * dokumen, sehingga langkah tampak bersyarat tetapi selalu berlaku — kegagalan
 * yang tidak terlihat sampai produksi.
 *
 * Satu langkah boleh punya **beberapa aturan** dengan penghubung AND/OR. Itulah
 * yang membuat rentang bisa diekspresikan (`> 5jt AND <= 50jt`) — hal yang
 * mustahil dengan satu aturan. Penghubung hanya muncul saat ada lebih dari satu
 * aturan; menampilkannya untuk satu aturan hanya menambah keputusan tanpa arti.
 */
export function ConditionBuilder({ transactionType, value, onChange, idPrefix, disabled = false }: ConditionBuilderProps) {
  const fields = conditionFieldsFor(transactionType);
  const group: ConditionGroup = value ?? { combinator: 'AND', conditions: [{ field: fields[0] ?? '', op: '>', value: 0 }] };

  const update = (next: ConditionGroup) => onChange(next);

  const setCondition = (index: number, patch: Partial<ConditionGroup['conditions'][number]>) => {
    update({
      ...group,
      conditions: group.conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    });
  };

  const addCondition = () => {
    update({
      ...group,
      conditions: [...group.conditions, { field: fields[0] ?? '', op: '>', value: 0 }],
    });
  };

  const removeCondition = (index: number) => {
    const next = group.conditions.filter((_, i) => i !== index);
    // Grup tidak boleh kosong: satu aturan minimum. Menghapus yang terakhir
    // berarti membatalkan syarat, dan itu keputusan pemanggil (toggle), bukan
    // efek samping tombol hapus baris.
    if (next.length === 0) return;
    update({ ...group, conditions: next });
  };

  return (
    <div className="space-y-2">
      {group.conditions.length > 1 && (
        <div className="flex items-center gap-2">
          <Label htmlFor={`${idPrefix}-combinator`} className="sr-only">Match</Label>
          <Select
            value={group.combinator}
            onValueChange={(next) => update({ ...group, combinator: next as 'AND' | 'OR' })}
            disabled={disabled}
          >
            <SelectTrigger id={`${idPrefix}-combinator`} aria-label="Match" className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">Match all</SelectItem>
              <SelectItem value="OR">Match any</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-caption text-neutral-500">
            of the {group.conditions.length} rules below
          </span>
        </div>
      )}

      <ul className="space-y-2">
        {group.conditions.map((condition, index) => (
          <li key={index} data-slot="condition-rule" className="space-y-2">
            {/* Baris 1 — Field + slot tombol hapus.
                Field diberi satu baris penuh karena ia label terpanjang
                ("Estimated total" ~104px). Di inspector yang hanya 303px,
                grid 4 kolom menyisakan ~68px per kolom dan label itu pecah
                dua baris. Grid `1fr + auto` memberi Field ~265px: margin
                lebih dari 2,5x terhadap label terpanjang, sehingga tahan
                terhadap beda font, zoom, dan terjemahan — bukan bergantung
                pada selisih beberapa piksel. */}
            <div
              data-slot="rule-row-field"
              className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-2"
            >
              <div data-slot="rule-field" className="min-w-0">
                {index === 0 && <Label htmlFor={`${idPrefix}-field-${index}`}>Field</Label>}
                <Select
                  value={condition.field}
                  onValueChange={(next) => setCondition(index, { field: next })}
                  disabled={disabled}
                >
                  <SelectTrigger id={`${idPrefix}-field-${index}`} aria-label={`Condition ${index + 1} field`}>
                    <SelectValue placeholder="Select field…" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((f) => (
                      <SelectItem key={f} value={f}>{conditionFieldLabel(f)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Slot tombol hapus selalu memesan ruangnya, juga saat aturan
                  masih satu. Kalau tidak, Field melebar lalu menyempit saat
                  aturan kedua ditambah — itu layout shift (rule 19, High). */}
              <div data-slot="rule-remove-slot" className="flex w-7 items-center justify-end pb-0.5">
                {!disabled && group.conditions.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeCondition(index)}
                    aria-label={`Remove rule ${index + 1}`}
                    className="px-2 text-neutral-500"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>

            {/* Baris 2 — Operator + Amount. Pasangan semantik satu aturan:
                "nilai ini, dengan operator ini". */}
            <div
              data-slot="rule-row-operator-amount"
              className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-2"
            >
              <div data-slot="rule-operator">
                {index === 0 && <Label htmlFor={`${idPrefix}-op-${index}`}>Operator</Label>}
                <Select
                  value={condition.op}
                  onValueChange={(next) => setCondition(index, { op: next as ConditionGroup['conditions'][number]['op'] })}
                  disabled={disabled}
                >
                  <SelectTrigger id={`${idPrefix}-op-${index}`} aria-label={`Condition ${index + 1} operator`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op} value={op}>{opLabel(op)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div data-slot="rule-amount">
                {index === 0 && <Label htmlFor={`${idPrefix}-value-${index}`}>Amount (IDR)</Label>}
                <Input
                  id={`${idPrefix}-value-${index}`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  disabled={disabled}
                  aria-label={`Condition ${index + 1} amount`}
                  value={condition.value === 0 && !Number.isFinite(condition.value) ? '' : condition.value}
                  onChange={(e) => setCondition(index, { value: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="font-mono tabular-nums"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!disabled && (
        <Button size="sm" variant="ghost" onClick={addCondition} className="px-2">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add rule
        </Button>
      )}
    </div>
  );
}
