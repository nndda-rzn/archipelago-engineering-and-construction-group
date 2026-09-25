import { ConflictException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from './prisma.service';

const logger = new Logger('SerializableTx');

/** Kode Prisma untuk konflik serialisasi / deadlock (SSI di Postgres). */
const PRISMA_RETRYABLE = new Set(['P2034']);
/** Kode mentah Postgres bila Prisma tidak membungkusnya: 40001 serialization_failure, 40P01 deadlock_detected. */
const PG_RETRYABLE = new Set(['40001', '40P01']);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isRetryable(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: unknown }).code;
  if (typeof code === 'string' && PRISMA_RETRYABLE.has(code)) return true;
  const pg = (err as { meta?: { code?: unknown } }).meta?.code;
  if (typeof pg === 'string' && PG_RETRYABLE.has(pg)) return true;
  // PrismaPg can surface PostgreSQL 40001 at COMMIT as an adapter error instead
  // of wrapping it in P2034. Match the adapter's structured kind, not message text.
  const adapter = err as { name?: unknown; cause?: { kind?: unknown } };
  return adapter.name === 'DriverAdapterError' && adapter.cause?.kind === 'TransactionWriteConflict';
}

export interface SerializableRetryOptions {
  /** Label jalur untuk log retry (mis. 'MaterialIssue.create'). */
  label: string;
  /** Total percobaan (termasuk percobaan pertama). Default 3. */
  maxAttempts?: number;
  /** Delay dasar backoff eksponensial (ms). Default 25. */
  baseDelayMs?: number;
  /** Batas durasi satu percobaan transaksi (ms). Default 15000. */
  timeoutMs?: number;
}

/**
 * Jalankan transaksi SERIALIZABLE dengan retry terbatas (backoff eksponensial + jitter).
 *
 * Kontrak yang WAJIB dipatuhi pemanggil:
 *  - Semua baca-penentu (validasi yang menentukan boleh-tidaknya tulis) harus berada
 *    di dalam `fn`. Menambah isolation level tanpa memindahkan validasi tidak menutup race.
 *  - Objek `tx` yang diterima harus diteruskan ke helper lain (mis. StockLedgerWriter,
 *    SequenceHelper) supaya mereka ikut transaksi yang sama.
 *  - JANGAN menaruh audit / tulisan ke sumber lain di dalam `fn`: retry akan menggandakannya.
 *    Panggil audit setelah helper ini selesai.
 */
export async function withSerializableRetry<T>(
  prisma: PrismaService,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  opts: SerializableRetryOptions,
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 25;

  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: opts.timeoutMs ?? 15_000,
      });
    } catch (err) {
      if (!isRetryable(err) || attempt >= maxAttempts) {
        if (isRetryable(err)) {
          logger.warn(`${opts.label}: retry habis setelah ${attempt} percobaan`);
          // PrismaPg may surface 40001 at COMMIT as DriverAdapterError rather
          // than P2034; the global filter only recognizes the latter. Normalize
          // both after the final retry so callers never receive a generic 500.
          throw new ConflictException({
            code: 'RETRY_CONFLICT',
            message: 'Konflik transaksi bersamaan, silakan coba lagi',
          });
        }
        throw err;
      }
      const backoff = baseDelayMs * 2 ** (attempt - 1) + Math.floor(Math.random() * baseDelayMs);
      logger.warn(`${opts.label}: konflik serialisasi, retry ${attempt + 1}/${maxAttempts} dalam ${backoff}ms`);
      await sleep(backoff);
    }
  }
}
