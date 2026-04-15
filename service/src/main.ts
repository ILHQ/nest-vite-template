import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import envConfig from '../env';
import { EventEmitter } from 'events';
import { ProxyViteService } from './proxyVite/proxy.service';
import process from 'process';
import { networkInterfaces } from 'os';
import type { NextFunction, Request, Response } from 'express';
import { appLogger, createTraceId } from './logger/app-logger';
import {
  normalizeRequestPath,
  shouldLogHttpRequest,
  shouldLogHttpError,
} from './logger/log-policy';
import { AllExceptionsFilter } from './http-exception.filter';
import { HttpResponseInterceptor } from './http-response.interceptor';

type TraceableRequest = Request & {
  traceId?: string;
  errorLogged?: boolean;
};

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
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: appLogger,
  });
  app.useLogger(appLogger);
  const reflector = app.get(Reflector);
  app.useGlobalFilters(new AllExceptionsFilter(reflector));
  app.useGlobalInterceptors(new HttpResponseInterceptor(reflector));
  const proxyViteService = app.get(ProxyViteService);
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 记录白名单接口访问日志，并兜底记录 5xx 错误日志。
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startAt = Date.now();
    const traceId = createTraceId();
    const traceableReq = req as TraceableRequest;
    traceableReq.traceId = traceId;
    res.setHeader('x-trace-id', traceId);

    res.on('finish', () => {
      const requestPath = normalizeRequestPath(req.originalUrl ?? req.url);
      const requestMetadata = {
        traceId,
        method: req.method,
        path: requestPath,
        statusCode: res.statusCode,
        durationMs: Date.now() - startAt,
        ip: req.ip,
        userAgent: req.headers['user-agent'] ?? '',
        headers: req.headers,
      };

      if (shouldLogHttpRequest(requestPath)) {
        appLogger.logHttpRequest(requestMetadata);
      }

      if (shouldLogHttpError(res.statusCode) && !traceableReq.errorLogged) {
        appLogger.logHttpException({
          ...requestMetadata,
          message: `HTTP_${res.statusCode}_RESPONSE`,
          errorName: 'HttpErrorResponse',
        });
      }
    });

    next();
  });

  // public 资源先走本地静态目录，未命中会继续流转到后面的 Vite 代理。
  app.useStaticAssets(envConfig.paths.servicePublicRoot, {
    prefix: `${envConfig.routerPrefix}/public/`,
  });

  // 仅在开发环境挂载 Vite 代理与 HMR WebSocket 转发。
  if (isDevelopment) {
    // 开发环境下，public 资源未命中 service/public 时回退到 frontend/public。
    app.useStaticAssets(join(envConfig.paths.repoRoot, 'frontend', 'public'), {
      prefix: `${envConfig.routerPrefix}/public/`,
    });

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
  const healthUrl = `http://localhost:${servicePort}/health`;
  appLogger.logStartup(`[service] started at ${entryUrl}`);
  appLogger.logStartup(`[service] health check: ${healthUrl}`);

  const lanAddresses = getLanIPv4Addresses();
  if (lanAddresses.length > 0) {
    for (const address of lanAddresses) {
      const lanEntryUrl = `http://${address}:${servicePort}${envConfig.routerPrefix}`;
      const lanHealthUrl = `http://${address}:${servicePort}/health`;
      appLogger.logStartup(`[service] lan started at ${lanEntryUrl}`);
      appLogger.logStartup(`[service] lan health check: ${lanHealthUrl}`);
    }
  } else {
    appLogger.warnStartup('[service] 未检测到可用的局域网 IPv4 地址');
  }
}
void bootstrap();
