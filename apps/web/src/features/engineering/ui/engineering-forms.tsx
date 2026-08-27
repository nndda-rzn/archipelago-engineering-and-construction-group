import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import {
  useCreateDeliverable,
  useCreateDrawing,
  useCreateRfi,
  useCreateSubmittal,
  useCreateTransmittal,
} from '../model/engineering.api';

export type EngTab = 'deliverables' | 'drawings' | 'rfis' | 'submittals' | 'transmittals';

interface EngCreateFormProps {
  tab: EngTab;
  onClose: () => void;
}

export function EngCreateForm({ tab, onClose }: EngCreateFormProps) {
  const [title, setTitle] = useState('');
  const [engineer, setEngineer] = useState('');
  const [question, setQuestion] = useState('');
  const [recipient, setRecipient] = useState('');

  const createDlv = useCreateDeliverable();
  const createDrw = useCreateDrawing();
  const createRfi = useCreateRfi();
  const createSub = useCreateSubmittal();
  const createTrm = useCreateTransmittal();

  const isPending =
    createDlv.isPending ||
    createDrw.isPending ||
    createRfi.isPending ||
    createSub.isPending ||
    createTrm.isPending;

  const reset = () => {
    setTitle('');
    setEngineer('');
    setQuestion('');
    setRecipient('');
    onClose();
  };

  const submit = () => {
    if (tab === 'deliverables' && title && engineer) createDlv.mutate({ title, engineer }, { onSuccess: reset });
    if (tab === 'drawings' && title) createDrw.mutate({ title }, { onSuccess: reset });
    if (tab === 'rfis' && title && question) createRfi.mutate({ title, question }, { onSuccess: reset });
    if (tab === 'submittals' && title) createSub.mutate({ title }, { onSuccess: reset });
    if (tab === 'transmittals' && recipient && title)
      createTrm.mutate({ recipient, subject: title }, { onSuccess: reset });
  };

  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="eng-title">{tab === 'transmittals' ? 'Subjek' : 'Judul'}</Label>
          <Input id="eng-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        {tab === 'deliverables' && (
          <div>
            <Label htmlFor="eng-eng">Engineer</Label>
            <Input id="eng-eng" value={engineer} onChange={(e) => setEngineer(e.target.value)} />
          </div>
        )}
        {tab === 'rfis' && (
          <div className="flex-1">
            <Label htmlFor="eng-q">Pertanyaan</Label>
            <Input id="eng-q" value={question} onChange={(e) => setQuestion(e.target.value)} />
          </div>
        )}
        {tab === 'transmittals' && (
          <div>
            <Label htmlFor="eng-recipient">Penerima</Label>
            <Input
              id="eng-recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>
        )}
        <Button onClick={submit} loading={isPending}>
          Buat
        </Button>
      </div>
    </div>
  );
}
