export interface TimeIdCursor {
  createdAt: Date;
  id: string;
}

/**
 * Encode/decode cursor keyset untuk tabel yang di-order `createdAt desc, id desc`.
 *
 * `id` (cuid) dipakai sebagai tiebreaker agar urutan total dan keyset stabil
 * walau `createdAt` sama (bulk insert). Format payload: `<ISO>|<id>` → base64url.
 */
export function encodeCursor(cursor: TimeIdCursor): string {
  return Buffer.from(`${cursor.createdAt.toISOString()}|${cursor.id}`, 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): TimeIdCursor | null {
  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const sep = decoded.indexOf('|');
    if (sep <= 0) return null;
    const iso = decoded.slice(0, sep);
    const id = decoded.slice(sep + 1);
    if (!iso || !id) return null;
    const createdAt = new Date(iso);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

/**
 * Bentuk klausa `where` keyset untuk order `createdAt desc, id desc`:
 * baris setelah cursor = `createdAt < c.createdAt` ATAU (`createdAt == c.createdAt` DAN `id < c.id`).
 */
export function keysetWhere<T>(baseWhere: T, cursor: TimeIdCursor): T & {
  OR: Array<{ createdAt: { lt: Date } } | { createdAt: Date; id: { lt: string } }>;
} {
  return {
    ...baseWhere,
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ],
  };
}
