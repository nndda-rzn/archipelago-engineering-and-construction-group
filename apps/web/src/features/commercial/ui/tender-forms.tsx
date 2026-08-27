import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useCreateBidDecision, useCreateTenderSubmission } from '../model/tender.api';
import type { OppOption } from './tender-types';

export function BidForm({ opportunities }: { opportunities: OppOption[] }) {
  const create = useCreateBidDecision();
  const [oppId, setOppId] = useState('');
  const [decision, setDecision] = useState('BID');
  const [rationale, setRationale] = useState('');
  const onSubmit = () => {
    if (!oppId) return;
    create.mutate({ id: oppId, decision, rationale: rationale || undefined }, { onSuccess: () => { setOppId(''); setRationale(''); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="bid-opp">Opportunity</Label>
          <select id="bid-opp" value={oppId} onChange={(e) => setOppId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {opportunities.map((o) => <option key={o.id} value={o.id}>{o.oppNumber} — {o.title}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="bid-dec">Keputusan</Label>
          <select id="bid-dec" value={decision} onChange={(e) => setDecision(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['BID', 'NO_BID'].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="bid-rat">Alasan</Label>
          <Input id="bid-rat" value={rationale} onChange={(e) => setRationale(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Simpan Keputusan</Button>
      </div>
    </div>
  );
}

export function SubmissionForm({ opportunities }: { opportunities: OppOption[] }) {
  const create = useCreateTenderSubmission();
  const [oppId, setOppId] = useState('');
  const [channel, setChannel] = useState('ELECTRONIC');
  const [packageVersion, setPackageVersion] = useState('');
  const [fileHash, setFileHash] = useState('');
  const onSubmit = () => {
    if (!oppId) return;
    create.mutate(
      { opportunityId: oppId, channel, packageVersion: packageVersion || undefined, fileHash: fileHash || undefined },
      { onSuccess: () => { setOppId(''); setPackageVersion(''); setFileHash(''); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="ts-opp">Opportunity</Label>
          <select id="ts-opp" value={oppId} onChange={(e) => setOppId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {opportunities.map((o) => <option key={o.id} value={o.id}>{o.oppNumber} — {o.title}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ts-ch">Channel</Label>
          <select id="ts-ch" value={channel} onChange={(e) => setChannel(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['ELECTRONIC', 'HARDCOPY', 'PORTAL'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ts-pkg">Versi Paket</Label>
          <Input id="ts-pkg" value={packageVersion} onChange={(e) => setPackageVersion(e.target.value)} placeholder="v1.2" />
        </div>
        <div className="flex-1">
          <Label htmlFor="ts-hash">File Hash</Label>
          <Input id="ts-hash" value={fileHash} onChange={(e) => setFileHash(e.target.value)} placeholder="sha256:..." />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Catat Submission</Button>
      </div>
    </div>
  );
}
