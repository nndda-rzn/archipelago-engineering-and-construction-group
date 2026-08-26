import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Prisma Decimal di-serialize sebagai string JSON ("5000000000"), padahal klien (web/mobile)
 * mengharap number. Interceptor global ini menkonversi string numerik -> number pada setiap
 * respons, KECUALI key identitas yang memang string (kode, nomor dokumen, NPWP, dll).
 *
 * Catatan: Int field (probability, version, score) dikirim Prisma sebagai number asli —
 * hanya Decimal yang jadi string. Jadi hanya string numerik yang perlu di-revive.
 */
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

@Injectable()
export class DecimalToNumberInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => JSON.parse(JSON.stringify(data), revive)));
  }
}
