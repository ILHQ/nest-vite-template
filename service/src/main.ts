import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import envConfig from '../env';
import { EventEmitter } from 'events';
import { ProxyViteService } from './proxyVite/proxy.service';
import process from 'process';
import { networkInterfaces } from 'os';

// 获取所有可用的局域网 IPv4 地址。
function getLanIPv4Addresses(): string[] {
  const networkInfo = networkInterfaces();
  const addresses = Object.values(networkInfo)
    .flatMap((interfaces) => interfaces ?? [])
    .filter((item) => {
      const isIPv4 = item.family === 'IPv4';
      return isIPv4 && !item.internal;
    })
    .map((item) => item.address);

  return Array.from(new Set(addresses));
}

// 初始化服务并挂载 Vite 开发代理。
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const proxyViteService = app.get(ProxyViteService);
  const isDevelopment = process.env.NODE_ENV === 'development';

  // public 资源先走本地静态目录，未命中会继续流转到后面的 Vite 代理。
  app.useStaticAssets(envConfig.paths.servicePublicRoot, {
    prefix: `${envConfig.routerPrefix}/public/`,
  });

  // 仅在开发环境挂载 Vite 代理与 HMR WebSocket 转发。
  if (isDevelopment) {
    const viteDevProxy = proxyViteService.createViteDevProxy();
    app.use(viteDevProxy);

    app.getHttpServer().on('upgrade', (req, socket, head) => {
      if (proxyViteService.shouldProxyViteUpgradeRequest(req.url ?? '')) {
        viteDevProxy.upgrade(req, socket, head);
      }
    });
  }

  // 生产环境挂载前端构建产物目录。
  if (!isDevelopment) {
    // 生产环境下将 frontend/dist/public 也映射到统一的 /public 前缀。
    app.useStaticAssets(join(envConfig.paths.frontendDistRoot, 'public'), {
      prefix: `${envConfig.routerPrefix}/public/`,
    });

    app.useStaticAssets(envConfig.paths.frontendDistRoot, {
      prefix: envConfig.frontendAssetsPublicPath,
    });
  }

  app.setBaseViewsDir(join(envConfig.paths.serviceSrcRoot, 'view'));
  app.setViewEngine('ejs');

  EventEmitter.defaultMaxListeners = Infinity;

  const servicePort = envConfig.servicePort;
  await app.listen(servicePort);

  const entryUrl = `http://localhost:${servicePort}${envConfig.routerPrefix}`;
  console.log(`[service] started at ${entryUrl}`);

  const lanAddresses = getLanIPv4Addresses();
  if (lanAddresses.length > 0) {
    for (const address of lanAddresses) {
      const lanEntryUrl = `http://${address}:${servicePort}${envConfig.routerPrefix}`;
      console.log(`[service] lan started at ${lanEntryUrl}`);
    }
  } else {
    console.log('[service] 未检测到可用的局域网 IPv4 地址');
  }
}
void bootstrap();
