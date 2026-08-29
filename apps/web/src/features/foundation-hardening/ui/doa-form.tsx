import { useState } from 'react';
import { Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
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
          <Select value={transactionType} onValueChange={setTransactionType}>
            <SelectTrigger id="doaf-tx">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TX_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label htmlFor="doaf-from">Dari</Label><Input id="doaf-from" type="number" value={amountFrom} onChange={(e) => setAmountFrom(e.target.value)} className="w-28" /></div>
        <div><Label htmlFor="doaf-to">Sampai</Label><Input id="doaf-to" type="number" value={amountTo} onChange={(e) => setAmountTo(e.target.value)} className="w-28" /></div>
        <div>
          <Label htmlFor="doaf-risk">Risiko</Label>
          <Select value={riskLevel} onValueChange={setRiskLevel}>
            <SelectTrigger id="doaf-risk">
              <SelectValue placeholder="Semua" />
            </SelectTrigger>
            <SelectContent>
              {['LOW', 'MEDIUM', 'HIGH'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="doaf-lv">Level</Label>
          <Select value={approverLevel} onValueChange={setApproverLevel}>
            <SelectTrigger id="doaf-lv">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
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
        <Select value={transactionType} onValueChange={setTransactionType}>
          <SelectTrigger id="doar-tx">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TX_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
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
