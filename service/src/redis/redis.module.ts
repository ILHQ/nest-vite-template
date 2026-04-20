import { Module } from '@nestjs/common';
import { redisClientProvider } from './redis.provider';
import { RedisService } from './redis.service';
import { RedisQueryRepository } from './repositories/redis-query.repository';

// Redis 基础设施模块入口。
// 统一收敛 Redis 相关 provider，供业务模块按需注入。
@Module({
  providers: [redisClientProvider, RedisService, RedisQueryRepository],
  exports: [redisClientProvider, RedisService, RedisQueryRepository],
})
export class RedisModule {}
