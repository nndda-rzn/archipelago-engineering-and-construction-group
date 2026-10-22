import { AlertTriangle } from 'lucide-react';
import type { BudgetStatement } from '@aec/api-contracts';

/**
 * Peringatan kewajaran budget.
 *
 * Ditampilkan sebagai baris di atas tabel, bukan modal: ini konteks yang perlu
 * terbaca sambil bekerja, bukan sesuatu yang harus ditutup dulu.
 *
 * `pvMismatch` dihapus. Aturan lamanya menandai PV != BAC sebagai error, padahal
 * PV memang berada di bawah BAC sepanjang proyek berjalan dan baru menyamainya
 * saat selesai — di data dev, PV tepat 60% BAC pada 9 dari 10 proyek, sehingga
 * peringatan itu menyala hampir di mana-mana. Yang bermakna hanya PV = 0.
 */
export function BudgetWarnings({
  warnings,
  reconciliation,
}: {
  warnings: BudgetStatement['warnings'];
  reconciliation: BudgetStatement['reconciliation'];
}) {
  const lines: string[] = [];

  if (warnings.overContract) lines.push('Revised total exceeds the contract value.');
  if (warnings.noBudget.length > 0) {
    lines.push(
      `${warnings.noBudget.length} node${warnings.noBudget.length === 1 ? '' : 's'} without budget: ${warnings.noBudget.map((n) => n.code).join(', ')}`,
    );
  }
  if (warnings.overCommitted.length > 0) {
    lines.push(
      `${warnings.overCommitted.length} node${warnings.overCommitted.length === 1 ? '' : 's'} committed above budget: ${warnings.overCommitted.map((n) => n.code).join(', ')}`,
    );
  }
  if (warnings.pvCoverage.status === 'NO_BASELINE') {
    lines.push('No schedule baseline published yet — schedule indices are unavailable.');
  }
  if (warnings.pvCoverage.status === 'PARTIAL') {
    lines.push('Planned value exceeds the budget — schedule indices derived from it are unreliable.');
  }
  if (reconciliation.doubleCountRisk) {
    lines.push(
      'Material cost appears in both the stock ledger and expense journals — total may double count.',
    );
  }

  if (lines.length === 0) return null;

  return (
    <ul aria-label="Budget warnings" className="flex flex-col gap-1 border border-warning-200 bg-warning-50 px-3 py-2">
      {lines.map((line) => (
        <li key={line} className="flex items-start gap-1.5 text-caption text-warning-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
