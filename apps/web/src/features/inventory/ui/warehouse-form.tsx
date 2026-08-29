import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateWarehouse } from '../model/warehouse.api';

export function WarehouseForm({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('PROJECT');
  const [location, setLocation] = useState('');
  const create = useCreateWarehouse();

  const onSubmit = () => {
    if (!code || !name) return;
    create.mutate(
      { code, name, warehouseType: type, location: location || undefined },
      { onSuccess: () => { setCode(''); setName(''); setLocation(''); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div><Label htmlFor="wh-code">Kode</Label><Input id="wh-code" placeholder="WH-PROJ-014" value={code} onChange={(e) => setCode(e.target.value)} /></div>
        <div><Label htmlFor="wh-name">Nama</Label><Input id="wh-name" placeholder="Warehouse Proyek" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div>
          <Label htmlFor="wh-type">Tipe</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="wh-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PROJECT">PROJECT</SelectItem>
              <SelectItem value="CORPORATE">CORPORATE</SelectItem>
              <SelectItem value="TEMPORARY">TEMPORARY</SelectItem>
              <SelectItem value="VIRTUAL">VIRTUAL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label htmlFor="wh-location">Lokasi</Label><Input id="wh-location" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Simpan</Button>
      </div>
    </div>
  );
}
