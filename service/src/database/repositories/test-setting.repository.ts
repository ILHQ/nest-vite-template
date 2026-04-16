import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { POSTGRES_POOL } from '../database.constants';
import { PrismaService } from '../prisma.service';

// 统一收敛 TestSetting 的读写入口，避免业务层直接散落调用 Prisma。
@Injectable()
export class TestSettingRepository {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(POSTGRES_POOL) private readonly postgresPool: Pool,
  ) {}

  // 默认示例走 Prisma，体现 TestSetting 的主访问路径。
  async findByKey(key: string): Promise<{ key: string; value: string } | null> {
    return this.prismaService.testSetting.findUnique({
      where: { key },
      select: {
        key: true,
        value: true,
      },
    });
  }

  // 使用 upsert 展示 TestSetting 最常见的配置型数据写入模式。
  async upsertValue(key: string, value: string): Promise<{ key: string; value: string }> {
    return this.prismaService.testSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
      select: {
        key: true,
        value: true,
      },
    });
  }

  // 为复杂 SQL 场景预留原生 pg 的下钻入口。
  async pingWithPool(): Promise<boolean> {
    await this.postgresPool.query('SELECT 1');
    return true;
  }
}
