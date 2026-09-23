/**
 * Utilitas CSV server-side untuk export besar (NFR §33.1/§44.7: report berat async/stream,
 * jangan load-all ke memori).
 *
 * Nilai: baris dilewatkan satu per satu sebagai string; `Readable.from(generator)` mengalirkan
 * ke response tanpa menampung seluruh dataset di memori.
 */

/** Escape satu sel CSV (RFC 4180): kutip bila mengandung koma, kutip, atau newline. */
export function csvEscape(value: unknown): string {
  if (value == null) return '';
  const s = typeof value === 'string' ? value : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Gabung satu baris jadi string CSV. */
export function csvRow(cells: unknown[]): string {
  return cells.map(csvEscape).join(',');
}

/**
 * Bungkus generator baris (tanpa newline) menjadi async generator string CSV siap-stream.
 * Menyisipkan '\r\n' antar baris (kompatibel Excel) + BOM UTF-8 di awal supaya Excel
 * mengenali encoding. Dipakai langsung oleh `Readable.from(...)`.
 */
const BOM = '\uFEFF';

export async function* toCsvLines(rows: AsyncIterable<string[]>): AsyncGenerator<string> {
  let first = true;
  for await (const cells of rows) {
    const line = csvRow(cells);
    if (first) {
      yield `${BOM}${line}`;
      first = false;
    } else {
      yield `\r\n${line}`;
    }
  }
}

/** Header Content-Disposition aman (ASCII) + fallback filename* UTF-8. */
export function contentDisposition(filename: string): string {
  const safe = filename.replace(/[^\w.-]/g, '_');
  return `attachment; filename="${safe}.csv"; filename*=UTF-8''${encodeURIComponent(`${filename}.csv`)}`;
}
