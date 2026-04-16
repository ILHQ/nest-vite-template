import { Module } from '@nestjs/common';
import { ProxyViteService } from './proxy.service';
import { ProxyViteController } from './proxy.controller';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ProxyViteService],
  controllers: [ProxyViteController],
})
export class ProxyViteModules {}
