import { Controller, Get, UseFilters, Redirect, Render, All, Req, Res } from '@nestjs/common';
import { ProxyViteService } from './proxy.service';
import type { Request, Response } from 'express';
import { AllExceptionsFilter } from '../http-exception.filter';
import envConfig from '../../env';
import process from 'process';
import path from 'node:path';
const fs = require('fs-extra');

const viteManifestPath = path.join(envConfig.paths.frontendDistRoot, 'manifest.json');

type ViteManifestEntry = {
  file: string;
  css?: string[];
};

type ViteManifest = Record<string, ViteManifestEntry>;

@Controller()
@UseFilters(AllExceptionsFilter)
export class ProxyViteController {
  constructor(private readonly proxyViteService: ProxyViteService) {}

  // 根路径重定向到前端路由前缀。
  @Get()
  @Redirect(envConfig.routerPrefix, 302)
  getPath(): void {}

  // 服务健康检查。
  @Get(`/health`)
  getHealth(): string {
    return this.proxyViteService.getHealth();
  }

  // 接口代理前缀占位，后续可在此挂具体 API 代理逻辑。
  @All(`${envConfig.proxyPrefix}/*path`)
  proxyApiPlaceholder(@Req() _req: Request, @Res() res: Response): void {
    res.status(501).json({
      message: `请在 ${envConfig.proxyPrefix} 下实现具体接口代理`,
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
        faviconPath: `${envConfig.frontendAssetsPublicPath}public/vite.svg`,
        cssFiles: (entry.css ?? []).map(
          (cssFile) => `${envConfig.frontendAssetsPublicPath}${cssFile}`,
        ),
        entryScript: `${envConfig.frontendAssetsPublicPath}${entry.file}`,
      };
    }

    return {
      title: envConfig.pkg.description ?? 'Frontend',
      faviconPath: `${envConfig.routerPrefix}/vite.svg`,
      cssFiles: [],
      reactRefreshPreamblePath: `${envConfig.routerPrefix}/@react-refresh`,
      viteClientScript: `${envConfig.routerPrefix}/@vite/client`,
      entryScript: `${envConfig.routerPrefix}/src/main.tsx`,
    };
  }
}
