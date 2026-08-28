import type { VendorPerformance } from '@/features/procurement';

export function VendorPerformanceSummaryTable({ items }: { items: VendorPerformance['items'] }) {
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="text-h3 text-neutral-900">Ringkasan Performance Vendor</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2">Vendor</th>
              <th className="px-4 py-2 text-center">Delivery</th>
              <th className="px-4 py-2 text-center">Quality</th>
              <th className="px-4 py-2 text-center">Commercial</th>
              <th className="px-4 py-2 text-center">HSE</th>
              <th className="px-4 py-2 text-center">Responsiveness</th>
              <th className="px-4 py-2 text-center">Overall</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.vendorCode} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-2">
                  <span className="font-mono text-neutral-600">{v.vendorCode}</span>
                  <span className="ml-2 text-neutral-800">{v.vendorName}</span>
                </td>
                {[v.DELIVERY, v.QUALITY, v.COMMERCIAL, v.HSE, v.RESPONSIVENESS].map((s, idx) => (
                  <td key={idx} className="px-4 py-2 text-center font-mono tabular-nums text-neutral-700">
                    {s || '-'}
                  </td>
                ))}
                <td className="px-4 py-2 text-center font-mono tabular-nums font-medium text-neutral-900">
                  {v.overall || '-'}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-caption text-neutral-500">Belum ada rating vendor.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
