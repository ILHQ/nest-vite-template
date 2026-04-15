import { Controller, Get, Redirect, Render, All, Req, Res } from '@nestjs/common';
import { ProxyViteService } from './proxy.service';
import type { Request, Response } from 'express';
import envConfig from '../../env';
import process from 'process';
import path from 'node:path';
const fs = require('fs-extra');
import { SkipResponseWrap } from '../skip-response-wrap.decorator';

const viteManifestPath = path.join(envConfig.paths.frontendDistRoot, 'manifest.json');

type ViteManifestEntry = {
  file: string;
  css?: string[];
};

type ViteManifest = Record<string, ViteManifestEntry>;

@Controller()
export class ProxyViteController {
  constructor(private readonly proxyViteService: ProxyViteService) {}

  // 根路径重定向到前端路由前缀。
  @Get()
  @Redirect(envConfig.routerPrefix, 302)
  getPath(): void {}

  // 服务健康检查。
  @Get(`/health`)
  @SkipResponseWrap()
  getHealth(): string {
    return 'hello';
  }

  // 服务环境变量
  @Get(`/env`)
  @SkipResponseWrap()
  getEnv(): typeof envConfig {
    return envConfig;
  }

  // 接口代理/api前缀
  @All(`${envConfig.proxyPrefix}/api/*path`)
  proxyApi(@Req() req: Request, @Res() res: Response): void {
    const proxy = this.proxyViteService.proxyApi();
    proxy(req, res, (result) => {
      if (result instanceof Error) {
        throw result;
      }
    });
  }

  // 前端页面统一返回 ejs 模板，资源由 Vite 代理提供。
  @Get([envConfig.routerPrefix, `${envConfig.routerPrefix}/`, `${envConfig.routerPrefix}/*path`])
  @Render('index')
  getIndex(): object {
    if (process.env.NODE_ENV === 'production') {
      const manifest = fs.readJsonSync(viteManifestPath) as ViteManifest;
      const entry = manifest['index.html'];

      if (!entry) {
        throw new Error('Vite manifest 缺少 index.html 入口');
      }

      return {
        title: envConfig.pkg.description ?? 'Frontend',
        faviconPath: `${envConfig.routerPrefix}/public/logo.png`,
        cssFiles: (entry.css ?? []).map(
          (cssFile) => `${envConfig.frontendAssetsPublicPath}${cssFile}`,
        ),
        entryScript: `${envConfig.frontendAssetsPublicPath}${entry.file}`,
      };
    }

    return {
      title: envConfig.pkg.description ?? 'Frontend',
      faviconPath: `${envConfig.routerPrefix}/public/logo.png`,
      cssFiles: [],
      reactRefreshPreamblePath: `${envConfig.routerPrefix}/@react-refresh`,
      viteClientScript: `${envConfig.routerPrefix}/@vite/client`,
      entryScript: `${envConfig.routerPrefix}/src/main.tsx`,
    };
  }
}
