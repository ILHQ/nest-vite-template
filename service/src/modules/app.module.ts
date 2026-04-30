import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ProxyViteModules } from './proxyVite/proxy.modules';
import { BusinessModules } from './business/business.modules';
import { TileModules } from './tile/tile.modules';
import envConfig from '@services/env';

const optionalImports: DynamicModule[] = [];
const optionalProviders: Provider[] = [];

if (envConfig.enableThrottle) {
  optionalImports.push(ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]));
  optionalProviders.push({ provide: APP_GUARD, useClass: ThrottlerGuard });
}

@Module({
  imports: [...optionalImports, TileModules, BusinessModules, ProxyViteModules],
  controllers: [],
  providers: [...optionalProviders],
})
export class AppModule {}
