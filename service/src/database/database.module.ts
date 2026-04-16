import { Module } from '@nestjs/common';
import { DatabaseHealthService } from './database.health';
import { postgresPoolProvider } from './postgres.provider';
import { PrismaService } from './prisma.service';
import { TemplateSettingRepository } from './repositories/template-setting.repository';

// 统一收敛数据库相关 provider，供业务模块按需注入。
@Module({
  providers: [PrismaService, postgresPoolProvider, DatabaseHealthService, TemplateSettingRepository],
  exports: [PrismaService, postgresPoolProvider, DatabaseHealthService, TemplateSettingRepository],
})
export class DatabaseModule {}
