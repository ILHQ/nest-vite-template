import { PrismaPg } from '@prisma/adapter-pg';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { Pool } from 'pg';
import envConfig from '@services/env';
import { POSTGRES_POOL } from './database.constants';

// 统一负责 Prisma 访问入口，并在应用关闭时释放 Prisma 与共享 pg 连接池资源。
@Injectable()
export class PrismaService extends PrismaClient implements OnApplicationShutdown {
  constructor(@Inject(POSTGRES_POOL) private readonly postgresPool: Pool) {
    super(
      envConfig.database.url.trim()
        ? {
            // Prisma 7 通过 adapter 复用 PostgreSQL 连接参数。
            adapter: new PrismaPg({ connectionString: envConfig.database.url }),
          }
        : undefined,
    );
  }

  // 保留显式连接入口，供需要提前建立 Prisma 连接的场景主动调用。
  async connect(): Promise<void> {
    await this.$connect();
  }

  // 健康检查使用最轻量的 SQL 探测数据库可用性。
  async ping(): Promise<void> {
    await this.$queryRawUnsafe('SELECT 1');
  }

  // 应用关闭时统一回收 Prisma 与共享 pg 连接池，避免进程被空闲连接阻塞。
  async onApplicationShutdown(): Promise<void> {
    try {
      await this.$disconnect();
    } finally {
      await this.postgresPool.end();
    }
  }
}
