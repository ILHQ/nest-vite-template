import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { DatabaseModule } from '@/database/database.module';
import { RedisModule } from '@/redis/redis.module';

@Module({
  imports: [DatabaseModule, RedisModule],
  providers: [BusinessService],
  controllers: [BusinessController],
})
export class BusinessModules {}
