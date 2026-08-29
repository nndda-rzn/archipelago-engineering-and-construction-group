import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateDailyReport } from '../model/work-package.api';

export function CreateDailyReportForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [weather, setWeather] = useState('CERAH');
  const [summary, setSummary] = useState('');
  const [issues, setIssues] = useState('');
  const [hseNote, setHseNote] = useState('');
  const [equipmentList, setEquipmentList] = useState('');
  const [materialList, setMaterialList] = useState('');
  const [lines, setLines] = useState<{ trade: string; count: string; hours: string }[]>([{ trade: 'KONSTRUKSI', count: '', hours: '' }]);
  const create = useCreateDailyReport(projectId);
  const updateLine = (i: number, field: string, value: string) => setLines(lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  const submit = () => {
    const manpowerLines = lines.filter((l) => l.trade && l.count).map((l) => ({ trade: l.trade, manpowerCount: Number(l.count), hoursWorked: Number(l.hours) || 0 }));
    if (!summary.trim()) return;
    create.mutate({ reportDate, weather, summary, issues: issues || undefined, hseNote: hseNote || undefined, equipmentList: equipmentList || undefined, materialList: materialList || undefined, manpowerLines }, { onSuccess: onDone });
  };

  return (
    <div className="space-y-3 rounded-md border border-neutral-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div><Label htmlFor="dr-date">Tanggal</Label><Input id="dr-date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} /></div>
        <div><Label htmlFor="dr-weather">Cuaca</Label><Select value={weather} onValueChange={setWeather}><SelectTrigger id="dr-weather"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CERAH">Cerah</SelectItem><SelectItem value="BERAWAN">Berawan</SelectItem><SelectItem value="MENDUNG">Mendung</SelectItem><SelectItem value="HUJAN">Hujan</SelectItem></SelectContent></Select></div>
        <div><Label>Manpower (baris)</Label><Button size="sm" variant="secondary" onClick={() => setLines([...lines, { trade: '', count: '', hours: '' }])}>+ Tambah</Button></div>
      </div>
      {lines.map((l, i) => <div key={i} className="grid grid-cols-1 gap-3 md:grid-cols-4"><div><Label>Trade</Label><Input value={l.trade} onChange={(e) => updateLine(i, 'trade', e.target.value)} placeholder="KONSTRUKSI" /></div><div><Label>Jumlah</Label><Input type="number" min={1} value={l.count} onChange={(e) => updateLine(i, 'count', e.target.value)} placeholder="10" /></div><div><Label>Jam Kerja</Label><Input type="number" min={0} max={24} value={l.hours} onChange={(e) => updateLine(i, 'hours', e.target.value)} placeholder="8" /></div><div className="flex items-end">{lines.length > 1 && <Button size="sm" variant="secondary" onClick={() => setLines(lines.filter((_, idx) => idx !== i))}>Hapus</Button>}</div></div>)}
      <div><Label htmlFor="dr-summary">Ringkasan Aktivitas</Label><textarea id="dr-summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-body-sm" placeholder="Aktivitas utama hari ini..." /></div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div><Label htmlFor="dr-issues">Masalah Lapangan</Label><Input id="dr-issues" value={issues} onChange={(e) => setIssues(e.target.value)} placeholder="Opsional" /></div>
        <div><Label htmlFor="dr-hse">Catatan HSE</Label><Input id="dr-hse" value={hseNote} onChange={(e) => setHseNote(e.target.value)} placeholder="Opsional" /></div>
        <div><Label htmlFor="dr-equip">Equipment</Label><Input id="dr-equip" value={equipmentList} onChange={(e) => setEquipmentList(e.target.value)} placeholder="Opsional" /></div>
        <div><Label htmlFor="dr-mat">Material</Label><Input id="dr-mat" value={materialList} onChange={(e) => setMaterialList(e.target.value)} placeholder="Opsional" /></div>
      </div>
      <div className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={onDone}>Batal</Button><Button size="sm" onClick={submit} disabled={create.isPending || !summary.trim()}>{create.isPending ? 'Menyimpan...' : 'Submit Daily Report'}</Button></div>
      {create.isError && <p className="text-body-sm text-destructive-600">Gagal menyimpan daily report.</p>}
    </div>
  );
}