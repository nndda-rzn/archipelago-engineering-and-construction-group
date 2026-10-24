/**
 * Invarian PV control account.
 *
 * Bug yang dijaga di sini: seed dan backfill pertama memberi PV penuh kepada
 * SETIAP control account yang menautkan sebuah WBS. Karena sebagian proyek punya
 * 5 CA untuk 4 WBS, WBS yang ditautkan dua CA menyumbang budgetnya dua kali dan
 * total PV melebihi BAC — terukur 2,96 T vs BAC 1,85 T pada PRJ-020. SPI jadi
 * rusak dengan cara yang berbeda dari bug aslinya.
 *
 * Fungsi di bawah adalah aturan yang dipakai seed dan migration: satu WBS hanya
 * boleh memberi PV kepada satu CA (kode terkecil).
 */

interface CaRow {
  id: string;
  code: string;
  wbsItemId: string;
  plannedValue: number;
}

/**
 * Kembalikan peta `caId -> pv` untuk CA yang berhak memegang PV sebuah WBS.
 * CA dengan kode terkecil per WBS menang; sisanya 0.
 */
export function assignPvPerWbs(cas: CaRow[], budgetByWbs: Map<string, number>): Map<string, number> {
  const winner = new Map<string, string>();
  for (const ca of [...cas].sort((a, b) => a.code.localeCompare(b.code))) {
    if (!winner.has(ca.wbsItemId)) winner.set(ca.wbsItemId, ca.id);
  }
  const out = new Map<string, number>();
  for (const ca of cas) {
    const isWinner = winner.get(ca.wbsItemId) === ca.id;
    const budget = budgetByWbs.get(ca.wbsItemId) ?? 0;
    out.set(ca.id, isWinner ? budget : 0);
  }
  return out;
}

const ca = (id: string, code: string, wbsItemId: string): CaRow => ({ id, code, wbsItemId, plannedValue: 0 });

describe('assignPvPerWbs', () => {
  it('never lets total PV exceed BAC when a WBS is linked by two control accounts', () => {
    // Bentuk data nyata PRJ-020: 5 CA untuk 4 WBS.
    const cas = [
      ca('a', 'CA-020-COMM', 'w4'),
      ca('b', 'CA-020-CONS', 'w3'),
      ca('c', 'CA-020-ENG', 'w1'),
      ca('d', 'CA-020-PROC', 'w2'),
      ca('e', 'CA-020-PROC-2', 'w2'),
    ];
    const budget = new Map([
      ['w1', 185_000_000_000],
      ['w2', 740_000_000_000],
      ['w3', 740_000_000_000],
      ['w4', 185_000_000_000],
    ]);
    const pv = assignPvPerWbs(cas, budget);
    const total = [...pv.values()].reduce((s, v) => s + v, 0);
    expect(total).toBe(1_850_000_000_000);
  });

  it('gives the budget to the lowest code when two control accounts share a WBS', () => {
    const cas = [ca('z', 'CA-020-PROC-2', 'w2'), ca('a', 'CA-020-PROC', 'w2')];
    const pv = assignPvPerWbs(cas, new Map([['w2', 740_000_000_000]]));
    expect(pv.get('a')).toBe(740_000_000_000);
    expect(pv.get('z')).toBe(0);
  });

  it('leaves PV at zero for a WBS without budget', () => {
    const cas = [ca('a', 'CA-030-ENG', 'w1')];
    const pv = assignPvPerWbs(cas, new Map());
    expect(pv.get('a')).toBe(0);
  });

  it('matches BAC exactly when every WBS has one control account', () => {
    const cas = [ca('a', 'CA-014-ENG', 'w1'), ca('b', 'CA-014-PROC', 'w2')];
    const pv = assignPvPerWbs(cas, new Map([['w1', 480_000_000_000], ['w2', 1_920_000_000_000]]));
    expect([...pv.values()].reduce((s, v) => s + v, 0)).toBe(2_400_000_000_000);
  });
});
