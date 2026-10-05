import { Badge, type BadgeVariant } from '@aec/ui';
import type { ChartOfAccount } from '@aec/api-contracts';

type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

const typeVariant: Record<AccountType, BadgeVariant> = {
  ASSET: 'success', LIABILITY: 'warning', EQUITY: 'default', REVENUE: 'default', EXPENSE: 'warning',
};
const typeLabel: Record<string, string> = {
  ASSET: 'Asset', LIABILITY: 'Liability', EQUITY: 'Equity', REVENUE: 'Revenue', EXPENSE: 'Expense',
};

export function ChartOfAccountTable({ accounts }: { accounts: ChartOfAccount[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-body">
        <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-2">Code</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Normal Balance</th><th className="px-4 py-2">Status</th></tr></thead>
        <tbody>{accounts.map((acc) => <tr key={acc.id} className="border-t border-neutral-100 hover:bg-neutral-50"><td className="px-4 py-2 font-mono text-neutral-800">{acc.code}</td><td className="px-4 py-2 text-neutral-700">{acc.name}</td><td className="px-4 py-2"><Badge variant={typeVariant[acc.accountType as AccountType]}>{typeLabel[acc.accountType] ?? acc.accountType}</Badge></td><td className="px-4 py-2 text-neutral-600">{acc.normalBalance}</td><td className="px-4 py-2">{acc.isActive ? <Badge variant="success">ACTIVE</Badge> : <Badge>INACTIVE</Badge>}</td></tr>)}{accounts.length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-caption text-neutral-500">No accounts yet.</td></tr>}</tbody>
      </table>
    </div>
  );
}
