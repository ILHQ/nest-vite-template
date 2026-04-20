import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';

// Redis 字符串查询结果的统一返回结构。
export type RedisStringRecord = {
  key: string;
  value: string | null;
};

// 统一收敛 Redis 字符串查询入口，避免业务层散落调用 get。
@Injectable()
export class RedisQueryRepository {
  constructor(private readonly redisService: RedisService) {}

  // 以业务可读的结构返回指定 key 的字符串值。
  async findByKey(key: string): Promise<RedisStringRecord> {
    const value = await this.redisService.getString(key);
    return { key, value };
  }
}
