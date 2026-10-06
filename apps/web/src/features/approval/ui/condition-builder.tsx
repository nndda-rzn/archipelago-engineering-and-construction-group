import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { conditionFieldLabel, conditionFieldsFor, opLabel } from './workflow-labels';

export interface ConditionValue {
  field: string;
  op: string;
  value: number | null;
}

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
 */
export function ConditionBuilder({ transactionType, value, onChange, idPrefix, disabled = false }: ConditionBuilderProps) {
  const fields = conditionFieldsFor(transactionType);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)_minmax(0,1fr)]">
      <div>
        <Label htmlFor={`${idPrefix}-field`}>Field</Label>
        <Select
          value={value.field}
          onValueChange={(next) => onChange({ ...value, field: next })}
          disabled={disabled}
        >
          <SelectTrigger id={`${idPrefix}-field`} aria-label="Condition field">
            <SelectValue placeholder="Select field…" />
          </SelectTrigger>
          <SelectContent>
            {fields.map((f) => (
              <SelectItem key={f} value={f}>{conditionFieldLabel(f)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-op`}>Operator</Label>
        <Select
          value={value.op}
          onValueChange={(next) => onChange({ ...value, op: next })}
          disabled={disabled}
        >
          <SelectTrigger id={`${idPrefix}-op`} aria-label="Condition operator">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATORS.map((op) => (
              <SelectItem key={op} value={op}>{opLabel(op)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-value`}>Amount (IDR)</Label>
        <Input
          id={`${idPrefix}-value`}
          type="number"
          min={0}
          inputMode="numeric"
          disabled={disabled}
          value={value.value ?? ''}
          onChange={(e) => onChange({ ...value, value: e.target.value === '' ? null : Number(e.target.value) })}
          className="font-mono tabular-nums"
        />
      </div>
    </div>
  );
}
