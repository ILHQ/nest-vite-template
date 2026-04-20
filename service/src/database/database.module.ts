import { Module } from '@nestjs/common';
import { DatabaseHealthService } from './database.health';
import { postgresPoolProvider } from './postgres.provider';
import { PrismaService } from './prisma.service';
import { TestSettingRepository } from './repositories/test-setting.repository';

// 统一收敛数据库相关 provider，供业务模块按需注入。
@Module({
  providers: [PrismaService, postgresPoolProvider, DatabaseHealthService, TestSettingRepository],
  exports: [PrismaService, postgresPoolProvider, DatabaseHealthService, TestSettingRepository],
})
export class DatabaseModule {}
