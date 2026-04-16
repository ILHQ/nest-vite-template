import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import envConfig from '@services/env';
import { POSTGRES_POOL } from './database.constants';
import { PrismaService } from './prisma.service';

export type DatabaseHealthStatus = {
  driver: 'postgresql';
  orm: 'prisma';
  status: 'up' | 'down' | 'misconfigured';
  checkedAt: string;
  pool: {
    min: number;
    max: number;
    total: number;
    idle: number;
    waiting: number;
  };
};

@Injectable()
export class DatabaseHealthService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(POSTGRES_POOL) private readonly postgresPool: Pool,
  ) {}

  // 健康检查同时返回探测结果和连接池运行时指标，便于定位连接耗尽问题。
  async getStatus(): Promise<DatabaseHealthStatus> {
    const checkedAt = new Date().toISOString();
    const poolStatus = {
      min: envConfig.database.pool.min,
      max: envConfig.database.pool.max,
      total: this.postgresPool.totalCount,
      idle: this.postgresPool.idleCount,
      waiting: this.postgresPool.waitingCount,
    };

    // 未配置连接串时直接标记为配置错误，避免继续触发数据库访问。
    if (!envConfig.database.url.trim()) {
      return {
        driver: 'postgresql',
        orm: 'prisma',
        status: 'misconfigured',
        checkedAt,
        pool: poolStatus,
      };
    }

    try {
      await this.prismaService.ping();

      return {
        driver: 'postgresql',
        orm: 'prisma',
        status: 'up',
        checkedAt,
        pool: poolStatus,
      };
    } catch {
      // 健康检查只返回状态，不在这里抛出异常打断接口响应。
      return {
        driver: 'postgresql',
        orm: 'prisma',
        status: 'down',
        checkedAt,
        pool: poolStatus,
      };
    }
  }
}
