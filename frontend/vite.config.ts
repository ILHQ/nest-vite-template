import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import envConfig from '../service/env';

const routerBasename =
  envConfig.routerPrefix === '/' ? '/' : envConfig.routerPrefix.replace(/\/$/, '');

// https://vite.dev/config/
export default defineConfig(() => {
  const base = `${routerBasename}/`;

  return {
    base,
    define: {
      __APP_ROUTER_BASENAME__: JSON.stringify(routerBasename),
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve('./src'),
      },
    },
    build: {
      outDir: path.resolve(__dirname, '../assets/dist'),
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
