import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
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
          <Select value={oppId} onValueChange={setOppId}>
            <SelectTrigger id="bid-opp">
              <SelectValue placeholder="Pilih…" />
            </SelectTrigger>
            <SelectContent>
              {opportunities.map((o) => <SelectItem key={o.id} value={o.id}>{o.oppNumber} — {o.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="bid-dec">Keputusan</Label>
          <Select value={decision} onValueChange={setDecision}>
            <SelectTrigger id="bid-dec">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['BID', 'NO_BID'].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
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
          <Select value={oppId} onValueChange={setOppId}>
            <SelectTrigger id="ts-opp">
              <SelectValue placeholder="Pilih…" />
            </SelectTrigger>
            <SelectContent>
              {opportunities.map((o) => <SelectItem key={o.id} value={o.id}>{o.oppNumber} — {o.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="ts-ch">Channel</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger id="ts-ch">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['ELECTRONIC', 'HARDCOPY', 'PORTAL'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
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
