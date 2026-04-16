import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [BusinessService],
  controllers: [BusinessController],
})
export class BusinessModules {}
