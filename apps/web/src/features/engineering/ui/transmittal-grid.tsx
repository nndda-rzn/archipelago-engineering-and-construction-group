import { createColumnHelper } from '@tanstack/react-table';
import type { Transmittal } from '@aec/api-contracts';
import { EngDateCell } from './engineering-shared';

const trmHelper = createColumnHelper<Transmittal>();

export const trmColumns = [
  trmHelper.accessor('transmittalNumber', { header: 'No.', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  trmHelper.accessor('recipient', { header: 'Penerima', cell: (info) => <span className="text-neutral-800">{info.getValue()}</span> }),
  trmHelper.accessor('subject', { header: 'Perihal', cell: (info) => <span className="max-w-xs truncate text-neutral-600">{info.getValue()}</span> }),
  trmHelper.accessor('sentAt', { header: 'Date', cell: (info) => <EngDateCell value={info.getValue()} /> }),
  trmHelper.accessor('sentBy', { header: 'Oleh', cell: (info) => <span className="text-neutral-600">{info.getValue()}</span> }),
];
