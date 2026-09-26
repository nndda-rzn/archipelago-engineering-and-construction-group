import { useState } from 'react';
import { Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusBadge } from '@aec/ui';
import { useCreateDeviation } from '../model/tender.api';
import type { ContractDeviation } from '@aec/api-contracts';
import { ApproveDeviationBtn, RejectDeviationBtn } from './tender-grid';
import type { OppOption } from './tender-types';

export function DeviationPanel({
  oppId, setOppId, opportunities, deviations, loading,
}: {
  oppId: string; setOppId: (v: string) => void; opportunities: OppOption[];
  deviations: ContractDeviation[]; loading: boolean;
}) {
  const create = useCreateDeviation(oppId);
  const [clause, setClause] = useState('');
  const [req, setReq] = useState('');
  const [position, setPosition] = useState('');
  const [owner, setOwner] = useState('');
  const onSubmit = () => {
    if (!oppId || !clause || !req || !position || !owner) return;
    create.mutate({ clause, clientRequirement: req, aecPosition: position, owner }, { onSuccess: () => { setClause(''); setReq(''); setPosition(''); setOwner(''); } });
  };
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="w-72">
          <Label htmlFor="dev-opp">Opportunity</Label>
          <Select value={oppId} onValueChange={setOppId}>
            <SelectTrigger id="dev-opp">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {opportunities.map((o) => <SelectItem key={o.id} value={o.id}>{o.oppNumber}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="dev-clause">Clause</Label>
          <Input id="dev-clause" value={clause} onChange={(e) => setClause(e.target.value)} />
        </div>
        <div className="flex-1">
          <Label htmlFor="dev-req">Client Req.</Label>
          <Input id="dev-req" value={req} onChange={(e) => setReq(e.target.value)} />
        </div>
        <div className="flex-1">
          <Label htmlFor="dev-pos">AEC Position</Label>
          <Input id="dev-pos" value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="dev-owner">Owner</Label>
          <Input id="dev-owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Create Deviation</Button>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs overflow-x-auto">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2">Clause</th>
              <th className="px-4 py-2">Client Req.</th>
              <th className="px-4 py-2">AEC Position</th>
              <th className="px-4 py-2">Risk</th>
              <th className="px-4 py-2">Owner</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(loading ? [] : deviations).map((d) => (
              <tr key={d.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-2 font-mono text-neutral-700">{d.clause}</td>
                <td className="px-4 py-2 max-w-[200px] truncate text-neutral-600">{d.clientRequirement}</td>
                <td className="px-4 py-2 max-w-[200px] truncate text-neutral-600">{d.aecPosition}</td>
                <td className="px-4 py-2"><Badge variant={d.risk === 'HIGH' ? 'warning' : 'default'}>{d.risk}</Badge></td>
                <td className="px-4 py-2 text-neutral-600">{d.owner}</td>
                <td className="px-4 py-2"><StatusBadge status={d.status} /></td>
                <td className="px-4 py-2">
                  {d.status === 'OPEN' && (
                    <div className="flex gap-1">
                      <ApproveDeviationBtn id={d.id} />
                      <RejectDeviationBtn id={d.id} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && deviations.length === 0 && <tr><td colSpan={7} className="px-4 py-4 text-caption text-neutral-500">No deviations yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
