import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import envConfig from '../env';
import { EventEmitter } from 'events';
import { ProxyViteService } from './proxyVite/proxy.service';
import process from 'process';

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

  await app.listen(envConfig.servicePort);
}
void bootstrap();
