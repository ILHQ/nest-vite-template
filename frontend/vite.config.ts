import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import envConfig from '../service/env';

const routerBasename =
  envConfig.routerPrefix === '/' ? '/' : envConfig.routerPrefix.replace(/\/$/, '');

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
    },
    plugins: [react(), copyPublicToDistPublicPlugin()],
    resolve: {
      alias: {
        '@': path.resolve('./src'),
      },
    },
    build: {
      outDir: path.resolve(__dirname, './dist'),
      emptyOutDir: true,
      manifest: 'manifest.json',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom', 'antd'],
            // 其他依赖可以继续添加
          },
        },
      },
    },
    css: {
      postcss: path.resolve(__dirname, 'postcss.config.js'),
    },
    server: {
      host: '0.0.0.0',
      port: 3100,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://192.168.3.200:60207',
          changeOrigin: true,
          rewrite: (proxyPath) => proxyPath.replace(/^\/api/, ''),
        },
      },
    },
  };
});
