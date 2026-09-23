import { csvEscape, csvRow, toCsvLines, contentDisposition } from './csv';

async function collect(rows: string[][]): Promise<string[]> {
  async function* gen(): AsyncGenerator<string[]> {
    for (const r of rows) yield r;
  }
  const out: string[] = [];
  for await (const chunk of toCsvLines(gen())) out.push(chunk);
  return out;
}

describe('csv helpers', () => {
  describe('csvEscape', () => {
    it('null/undefined -> string kosong', () => {
      expect(csvEscape(null)).toBe('');
      expect(csvEscape(undefined)).toBe('');
    });

    it('nilai biasa dibiarkan', () => {
      expect(csvEscape('abc')).toBe('abc');
      expect(csvEscape(42)).toBe('42');
    });

    it('koma / kutip / newline dikutip + kutip di-escape', () => {
      expect(csvEscape('a,b')).toBe('"a,b"');
      expect(csvEscape('he said "hi"')).toBe('"he said ""hi"""');
      expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
      expect(csvEscape('cr\rlf')).toBe('"cr\rlf"');
    });
  });

  describe('csvRow', () => {
    it('menggabung sel dengan koma', () => {
      expect(csvRow(['a', 1, null, 'x,y'])).toBe('a,1,,"x,y"');
    });
  });

  describe('toCsvLines', () => {
    it('baris pertama diawali BOM, baris berikut CRLF, tanpa newline ekor', async () => {
      const out = await collect([
        ['a', 'b'],
        ['1', '2'],
      ]);
      expect(out).toHaveLength(2);
      expect(out[0]).toBe('\uFEFFa,b');
      expect(out[1]).toBe('\r\n1,2');
    });

    it('dataset kosong -> tanpa chunk', async () => {
      expect(await collect([])).toEqual([]);
    });
  });

  describe('contentDisposition', () => {
    it('menghasilkan attachment + filename ASCII aman + filename* UTF-8', () => {
      const h = contentDisposition('stock-ledger');
      expect(h).toContain('attachment');
      expect(h).toContain('filename="stock-ledger.csv"');
      expect(h).toContain("filename*=UTF-8''stock-ledger.csv");
    });

    it('nama dengan spasi disanitasi pada filename ASCII', () => {
      const h = contentDisposition('aging ar/ap');
      expect(h).toContain('filename="aging_ar_ap.csv"');
    });
  });
});
