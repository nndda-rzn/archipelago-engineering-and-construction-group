import type { LegalEntity } from '@aec/api-contracts';

const fmtDate = (value: string) => (value ? value.slice(0, 10) : '—');

/** Profil entity sebagai definition list — metadata, bukan kartu. */
export function LegalEntityProfile({ entity }: { entity: LegalEntity }) {
  const rows: Array<[string, string]> = [
    ['Code', entity.code],
    ['Legal name', entity.legalName],
    ['Tax ID', entity.taxIdentifier],
    ['Country', entity.country],
    ['Functional currency', entity.functionalCurrency],
    ['Reporting currency', entity.reportingCurrency],
    ['Fiscal calendar', entity.fiscalCalendar],
    ['Status', entity.status],
    ['Created', fmtDate(entity.createdAt)],
    ['Updated', fmtDate(entity.updatedAt)],
  ];
  return (
    <section aria-label="Profile">
      <h2 className="text-overline uppercase text-neutral-500">Profile</h2>
      <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 border-b border-neutral-100 py-1.5 last:border-0">
            <dt className="text-body-sm text-neutral-500">{label}</dt>
            <dd className="font-mono text-body-sm tabular-nums text-neutral-900">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
