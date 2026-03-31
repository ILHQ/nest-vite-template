import { Module } from '@nestjs/common';
import { ProxyViteModule } from './proxyVite/proxy.modules';

@Module({
  imports: [ProxyViteModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
