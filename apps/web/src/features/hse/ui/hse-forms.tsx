import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useCreateIncident, useCreateObservation, useCreatePermit } from '../model/hse.api';

export function ObservationForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState('UNSAFE');
  const [description, setDescription] = useState('');
  const create = useCreateObservation();
  const onSubmit = () => {
    if (!description) return;
    create.mutate(
      { type, description },
      { onSuccess: () => { setDescription(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="obs-type">Tipe</Label>
          <select id="obs-type" value={type} onChange={(e) => setType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="UNSAFE">UNSAFE</option>
            <option value="SAFE">SAFE</option>
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="obs-desc">Deskripsi</Label>
          <Input id="obs-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Observasi</Button>
      </div>
    </div>
  );
}

export function IncidentForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState('NEAR_MISS');
  const [severity, setSeverity] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const create = useCreateIncident();
  const onSubmit = () => {
    if (!description) return;
    create.mutate(
      { type, severity, description },
      { onSuccess: () => { setDescription(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="inc-type">Tipe</Label>
          <select id="inc-type" value={type} onChange={(e) => setType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="NEAR_MISS">NEAR_MISS</option>
            <option value="INJURY">INJURY</option>
            <option value="PROPERTY">PROPERTY</option>
            <option value="ENVIRONMENT">ENVIRONMENT</option>
          </select>
        </div>
        <div>
          <Label htmlFor="inc-sev">Severity</Label>
          <select id="inc-sev" value={severity} onChange={(e) => setSeverity(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="inc-desc">Deskripsi</Label>
          <Input id="inc-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Insiden</Button>
      </div>
    </div>
  );
}

export function PermitForm({ onDone }: { onDone: () => void }) {
  const [area, setArea] = useState('');
  const [issuedTo, setIssuedTo] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const create = useCreatePermit();
  const onSubmit = () => {
    if (!area || !issuedTo || !validFrom || !validTo) return;
    create.mutate(
      { area, issuedTo, validFrom, validTo },
      { onSuccess: () => { setArea(''); setIssuedTo(''); setValidFrom(''); setValidTo(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="ptw-area">Area</Label>
          <Input id="ptw-area" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ptw-to">Diterbitkan ke</Label>
          <Input id="ptw-to" value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ptw-from">Dari</Label>
          <Input id="ptw-from" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ptw-until">Sampai</Label>
          <Input id="ptw-until" type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Terbitkan PTW</Button>
      </div>
    </div>
  );
}
