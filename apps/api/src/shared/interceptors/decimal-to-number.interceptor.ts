import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
