import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required');
    }

    const url = new URL(connectionString);
    const connectionLimit = Number(url.searchParams.get('connection_limit') ?? process.env.DATABASE_POOL_MAX ?? 10);
    const poolTimeout = Number(url.searchParams.get('pool_timeout') ?? process.env.DATABASE_POOL_TIMEOUT ?? 10);

    super({
      adapter: new PrismaPg({ connectionString }),
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
      ],
    });

    const slowQueryMs = Number(process.env.SLOW_QUERY_MS ?? 200);
    this.$on('query' as never, (e: { query: string; duration: number; params: string }) => {
      if (e.duration > slowQueryMs) {
        this.logger.warn(
          `Slow query ${e.duration.toFixed(0)}ms: ${e.query.slice(0, 200)} ${e.params ? `params=${e.params.slice(0, 100)}` : ''}`,
        );
      }
    });
    this.$on('error' as never, (e: { message: string; target?: string }) => {
      this.logger.error(`Prisma error: ${e.message}${e.target ? ` (${e.target})` : ''}`);
    });

    this.logger.log(`Prisma connected (pool=${connectionLimit}, pool_timeout=${poolTimeout}s, slow_threshold=${slowQueryMs}ms)`);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
