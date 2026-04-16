import { Injectable } from '@nestjs/common';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import envConfig from '@services/env';

type ProxyMiddleware = RequestHandler & {
  upgrade: (req: IncomingMessage, socket: Duplex, head: Buffer) => void;
};

@Injectable()
export class ProxyViteService {
  // 代理/api
  proxyApi(): typeof envConfig {
    return createProxyMiddleware({
      target: envConfig.proxyApi,
      changeOrigin: true,
      pathRewrite: { [`^${envConfig.proxyPrefix}`]: '/api' },
      on: {
        proxyRes: (proxyRes, req, res) => {
          res.removeHeader('Content-Length');
          res.setHeader('Transfer-Encoding', 'chunked');
        },
      },
    });
  }

  // 去掉 query，统一按路径做匹配判断。
  private normalizePath(pathname: string): string {
    return pathname.split('?')[0];
  }

  // 判断是否命中接口代理前缀，命中后不应走 Vite 代理。
  private isProxyPrefixPath(pathname: string): boolean {
    return pathname === envConfig.proxyPrefix || pathname.startsWith(`${envConfig.proxyPrefix}/`);
  }

  // 判断是否命中前端路由前缀。
  private isFrontendRoutePath(pathname: string): boolean {
    return pathname === envConfig.routerPrefix || pathname.startsWith(`${envConfig.routerPrefix}/`);
  }

  // 判断是否命中 public 资源路径。
  private isPublicAssetPath(pathname: string): boolean {
    return (
      pathname === `${envConfig.routerPrefix}/public` ||
      pathname.startsWith(`${envConfig.routerPrefix}/public/`)
    );
  }

  // 判断是否是后端 API 路径。
  private isApiPath(pathname: string): boolean {
    return pathname.startsWith('/api');
  }

  // 判断请求是否是 HTML 文档请求。
  private isHtmlRequest(acceptHeader?: string | string[]): boolean {
    const accept = Array.isArray(acceptHeader) ? acceptHeader.join(',') : (acceptHeader ?? '');
    return accept.includes('text/html');
  }

  // HTTP 请求：HTML 走 ejs，其余资源请求转发到 Vite。
  shouldProxyViteRequest(pathname: string, acceptHeader?: string | string[]): boolean {
    const normalizedPath = this.normalizePath(pathname);

    if (this.isProxyPrefixPath(normalizedPath)) {
      return false;
    }

    if (this.isApiPath(normalizedPath)) {
      return true;
    }

    if (!this.isFrontendRoutePath(normalizedPath)) {
      return false;
    }

    // public 资源：优先由 service 静态中间件处理；未命中时自动回退到 Vite。
    if (this.isPublicAssetPath(normalizedPath)) {
      return true;
    }

    return !this.isHtmlRequest(acceptHeader);
  }

  // WS 请求：前端开发相关路径全部转发给 Vite（用于 HMR）。
  shouldProxyViteUpgradeRequest(pathname: string): boolean {
    const normalizedPath = this.normalizePath(pathname);

    if (this.isProxyPrefixPath(normalizedPath)) {
      return false;
    }

    // public 静态资源不需要 WS 升级。
    if (this.isPublicAssetPath(normalizedPath)) {
      return false;
    }

    return this.isFrontendRoutePath(normalizedPath);
  }

  // 创建 Vite 开发服务代理中间件。
  createViteDevProxy(): ProxyMiddleware {
    return createProxyMiddleware({
      target: `http://localhost:${envConfig.frontendPort}`,
      ws: true,
      changeOrigin: true,
      pathFilter: (pathname, req) => this.shouldProxyViteRequest(pathname, req.headers.accept),
    }) as ProxyMiddleware;
  }
}
