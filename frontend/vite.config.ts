import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import envConfig from '../service/env';

const routerBasename =
  envConfig.routerPrefix === '/' ? '/' : envConfig.routerPrefix.replace(/\/$/, '');

// 复制 public 目录到 dist/public 目录
function copyPublicToDistPublicPlugin() {
  return {
    name: 'copy-public-to-dist-public',
    closeBundle() {
      const publicDir = path.resolve(__dirname, 'public');
      const distPublicDir = path.resolve(__dirname, 'dist/public');

      if (!existsSync(publicDir)) {
        return;
      }

      mkdirSync(distPublicDir, { recursive: true });
      cpSync(publicDir, distPublicDir, { recursive: true, force: true });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  const base = isBuild ? `${routerBasename}/frontend/dist/` : `${routerBasename}/`;

  return {
    base,
    define: {
      __APP_ROUTER_BASENAME__: JSON.stringify(routerBasename),
      __APP_PROXY_PREFIX__: JSON.stringify(envConfig.proxyPrefix),
    },
    plugins: [react(), copyPublicToDistPublicPlugin()],
    resolve: {
      tsconfigPaths: true,
    },
    build: {
      outDir: path.resolve(__dirname, './dist'),
      emptyOutDir: true,
      manifest: 'manifest.json',
    },
    css: {
      postcss: path.resolve(__dirname, 'postcss.config.js'),
    },
    server: {
      host: 'localhost',
      port: envConfig.frontendPort,
      strictPort: true,
    },
  };
});
