import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Readable } from 'node:stream';

const EXCLUDE_KEY = /(Code|Number|Id|Phone|Hash|Revision)$|tax|accountNumber|serialNumber|^unit$|^currency$/i;

function revive(_key: string, value: unknown): unknown {
  if (
    typeof value === 'string' &&
    value.trim() !== '' &&
    !Number.isNaN(Number(value)) &&
    !EXCLUDE_KEY.test(_key)
  ) {
    return Number(value);
  }
  return value;
}

/**
 * Deteksi payload non-JSON (file/stream). JSON round-trip di bawah akan merusak
 * payload jenis ini (StreamableFile/stream -> {}), jadi harus dilewatkan apa adanya.
 */
function isBinaryPayload(data: unknown): boolean {
  if (data instanceof StreamableFile) return true;
  if (Buffer.isBuffer(data)) return true;
  if (data instanceof Readable) return true;
  return typeof data === 'object' && data !== null && typeof (data as { pipe?: unknown }).pipe === 'function';
}

@Injectable()
export class DecimalToNumberInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // Jangan JSON.parse(JSON.stringify()) payload file/stream — akan jadi {}.
        if (isBinaryPayload(data)) return data;
        return JSON.parse(JSON.stringify(data), revive);
      }),
    );
  }
}
