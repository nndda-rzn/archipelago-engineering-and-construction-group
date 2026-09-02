import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;

  constructor() {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });
    this.client.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      if (raw == null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    } catch (err) {
      this.logger.warn(`Cache get fail ${key}: ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 30): Promise<void> {
    try {
      const payload = typeof value === 'string' ? value : JSON.stringify(value);
      await this.client.set(key, payload, 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache set fail ${key}: ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(`Cache del fail ${key}: ${(err as Error).message}`);
    }
  }

  async wrap<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached != null) return cached;
    const value = await compute();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}
