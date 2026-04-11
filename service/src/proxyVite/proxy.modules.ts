import { Module } from '@nestjs/common';
import { ProxyViteService } from './proxy.service';
import { ProxyViteController } from './proxy.controller';

@Module({
  providers: [ProxyViteService],
  controllers: [ProxyViteController],
})
export class ProxyViteModules {}
