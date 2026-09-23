import { StreamableFile } from '@nestjs/common';
import { Readable } from 'node:stream';
import { of } from 'rxjs';
import { DecimalToNumberInterceptor } from './decimal-to-number.interceptor';

function run(interceptor: DecimalToNumberInterceptor, value: unknown): Promise<unknown> {
  const next = { handle: () => of(value) };
  return new Promise((resolve) => {
    interceptor.intercept({} as never, next as never).subscribe((v) => resolve(v));
  });
}

describe('DecimalToNumberInterceptor', () => {
  const interceptor = new DecimalToNumberInterceptor();

  it('mengubah string numerik jadi number pada payload JSON biasa', async () => {
    const result = (await run(interceptor, { amount: '1234.56', name: 'x' })) as { amount: unknown };
    expect(result.amount).toBe(1234.56);
    expect(typeof result.amount).toBe('number');
  });

  it('tidak menyentuh field bernama Code/Number/Id', async () => {
    const result = (await run(interceptor, { poNumber: '12345', id: '99' })) as { poNumber: unknown; id: unknown };
    expect(result.poNumber).toBe('12345');
    expect(result.id).toBe('99');
  });

  it('melewatkan StreamableFile apa adanya (tidak jadi {})', async () => {
    const file = new StreamableFile(Readable.from(['a,b\n1,2']));
    const result = await run(interceptor, file);
    expect(result).toBe(file);
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('melewatkan Buffer apa adanya', async () => {
    const buf = Buffer.from('csv,data');
    const result = await run(interceptor, buf);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect((result as Buffer).toString()).toBe('csv,data');
  });

  it('melewatkan Readable stream apa adanya', async () => {
    const stream = Readable.from(['x']);
    const result = await run(interceptor, stream);
    expect(result).toBe(stream);
  });
});
