import { useMemo } from 'react';

export interface PermissionCell {
  code: string;
  resource: string;
  action: string;
}

/**
 * Matriks izin: baris = resource, kolom = action. Sel terisi = user memegang izin
 * itu. Ini menjawab "sebagai apa" secara visual — bukan daftar teks panjang.
 * Sel yang tidak berlaku (kombinasi resource×action tanpa izin di sistem) dibiarkan
 * kosong; sel yang berlaku tapi tak dimiliki diberi titik redup.
 */
export function PermissionMatrix({ permissions, allPermissions }: { permissions: PermissionCell[]; allPermissions: PermissionCell[] }) {
  const universe = allPermissions.length > 0 ? allPermissions : permissions;
  const { resources, actions, granted, pairs } = useMemo(() => {
    const resSet = new Set<string>();
    const actSet = new Set<string>();
    const pairSet = new Set<string>();
    for (const p of universe) {
      resSet.add(p.resource);
      actSet.add(p.action);
      pairSet.add(`${p.resource}.${p.action}`);
    }
    return {
      resources: [...resSet].sort(),
      actions: [...actSet].sort(),
      granted: new Set(permissions.map((p) => p.code)),
      pairs: pairSet,
    };
  }, [permissions, universe]);

  if (resources.length === 0) {
    return <p className="text-caption text-neutral-500">No permissions defined.</p>;
  }

  const grantedCount = permissions.length;
  const totalCount = universe.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100" role="img" aria-label={`${grantedCount} of ${totalCount} permissions`}>
          <div className="h-full rounded-full bg-racing-red-600" style={{ width: `${totalCount > 0 ? (grantedCount / totalCount) * 100 : 0}%` }} />
        </div>
        <span className="shrink-0 font-mono text-caption tabular-nums text-neutral-600">
          {grantedCount}/{totalCount}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse text-caption" aria-label="Permission matrix">
          <caption className="sr-only">Granted permissions by resource and action</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 bg-white px-2 py-1 text-left font-medium text-neutral-500">Resource</th>
              {actions.map((a) => (
                <th key={a} scope="col" className="px-1 py-1 text-center font-medium text-neutral-400" title={a}>
                  <span className="inline-block max-h-16 [writing-mode:vertical-rl] text-[10px] tracking-wide">{a}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => (
              <tr key={r} className="border-t border-neutral-100">
                <th scope="row" className="sticky left-0 bg-white px-2 py-0.5 text-left font-normal text-neutral-700">{r}</th>
                {actions.map((a) => {
                  const code = `${r}.${a}`;
                  const applicable = pairs.has(code);
                  const has = granted.has(code);
                  return (
                    <td key={a} className="px-1 py-0.5 text-center">
                      {has ? (
                        <span className="mx-auto block h-3.5 w-3.5 rounded-sm bg-racing-red-600" title={code} aria-label={`${code} granted`} />
                      ) : applicable ? (
                        <span className="mx-auto block h-3.5 w-3.5 rounded-sm bg-neutral-100" title={code} aria-hidden="true" />
                      ) : (
                        <span className="mx-auto block h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
