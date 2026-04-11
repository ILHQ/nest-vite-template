import { Module } from '@nestjs/common';
import { ProxyViteModules } from './proxyVite/proxy.modules';
import { BusinessModules } from './business/business.modules';

@Module({
  imports: [BusinessModules, ProxyViteModules],
  controllers: [],
  providers: [],
})
export class AppModule {}
