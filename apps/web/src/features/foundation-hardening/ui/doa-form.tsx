import { useState } from 'react';
import { Badge, Button, Input, Label } from '@aec/ui';
import { useCreateDoaRule, useResolveDoa } from '../model/foundation-hardening.api';

const TX_TYPES = ['PurchaseRequisition', 'PurchaseOrder', 'Journal', 'Payment', 'BudgetBaseline', 'Contract'];

export function DoaForm() {
  const create = useCreateDoaRule();
  const [transactionType, setTransactionType] = useState('PurchaseOrder');
  const [approverLevel, setApproverLevel] = useState('L2');
  const [amountFrom, setAmountFrom] = useState('');
  const [amountTo, setAmountTo] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [approverRoleCode, setApproverRoleCode] = useState('');
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="doaf-tx">Transaksi</Label>
          <select id="doaf-tx" value={transactionType} onChange={(e) => setTransactionType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {TX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div><Label htmlFor="doaf-from">Dari</Label><Input id="doaf-from" type="number" value={amountFrom} onChange={(e) => setAmountFrom(e.target.value)} className="w-28" /></div>
        <div><Label htmlFor="doaf-to">Sampai</Label><Input id="doaf-to" type="number" value={amountTo} onChange={(e) => setAmountTo(e.target.value)} className="w-28" /></div>
        <div>
          <Label htmlFor="doaf-risk">Risiko</Label>
          <select id="doaf-risk" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Semua</option>
            {['LOW', 'MEDIUM', 'HIGH'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="doaf-lv">Level</Label>
          <select id="doaf-lv" value={approverLevel} onChange={(e) => setApproverLevel(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div><Label htmlFor="doaf-role">Role</Label><Input id="doaf-role" value={approverRoleCode} onChange={(e) => setApproverRoleCode(e.target.value)} placeholder="PROCUREMENT_MANAGER" /></div>
        <Button onClick={() => {
          if (transactionType) create.mutate({
            transactionType, approverLevel,
            amountFrom: amountFrom ? Number(amountFrom) : undefined,
            amountTo: amountTo ? Number(amountTo) : undefined,
            riskLevel: riskLevel || undefined,
            approverRoleCode: approverRoleCode || undefined,
          }, { onSuccess: () => { setAmountFrom(''); setAmountTo(''); setApproverRoleCode(''); } });
        }} loading={create.isPending}>Buat Rule</Button>
      </div>
    </div>
  );
}

export function ResolveForm() {
  const resolve = useResolveDoa();
  const [transactionType, setTransactionType] = useState('PurchaseOrder');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<{ approverLevel: string; approverRoleCode: string | null } | null>(null);
  return (
    <div className="mt-2 flex items-end gap-3">
      <div>
        <Label htmlFor="doar-tx">Transaksi</Label>
        <select id="doar-tx" value={transactionType} onChange={(e) => setTransactionType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
          {TX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div><Label htmlFor="doar-amt">Amount</Label><Input id="doar-amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-36" /></div>
      <Button onClick={() => {
        resolve.mutate({ transactionType, amount: amount ? Number(amount) : undefined }, {
          onSuccess: (data) => {
            const r = data as unknown as { resolved: { approverLevel: string; approverRoleCode: string | null } | null };
            setResult(r.resolved);
          },
        });
      }} loading={resolve.isPending}>Resolve</Button>
      {result && (
        <div className="flex items-center gap-2">
          <span className="text-caption text-neutral-500">Approver:</span>
          <Badge variant="success">{result.approverLevel}</Badge>
          {result.approverRoleCode && <span className="font-mono text-body-sm text-neutral-700">{result.approverRoleCode}</span>}
        </div>
      )}
    </div>
  );
}
