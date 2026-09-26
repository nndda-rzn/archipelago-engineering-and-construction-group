import { Badge, ConfirmActionButton, StatusBadge, labelRole } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useBlockUser } from '@/entities/user';
import type { User } from '@aec/api-contracts';


const columnHelper = createColumnHelper<User>();

export const userColumns = [
  columnHelper.accessor('username', { header: 'Username', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  columnHelper.accessor('displayName', { header: 'Name', cell: (i) => <span className="text-neutral-900">{i.getValue()}</span> }),
  columnHelper.accessor('email', { header: 'Email', cell: (i) => <span className="text-neutral-600">{i.getValue()}</span> }),
  columnHelper.accessor('roles', { header: 'Roles', cell: (i) => <span className="flex flex-wrap gap-1">{i.getValue().map((role) => <Badge key={role} variant="default">{labelRole(role)}</Badge>)}</span> }),
  columnHelper.accessor('status', { header: 'Status', cell: (i) => <StatusBadge status={i.getValue()} /> }),
  columnHelper.display({ id: 'actions', header: '', cell: ({ row }) => <div className="flex justify-end gap-1"><BlockButton id={row.original.id} disabled={row.original.status !== 'ACTIVE'} /></div> }),
];

function BlockButton({ id, disabled }: { id: string; disabled: boolean }) {
  const block = useBlockUser();
  return <ConfirmActionButton variant="secondary" size="sm" disabled={disabled} confirmTitle="Block user" confirmDescription="This user will no longer be able to sign in." confirmLabel="Block" onConfirm={() => block.mutate(id)}>Block</ConfirmActionButton>;
}
