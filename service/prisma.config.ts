import { defineConfig } from 'prisma/config';
import envConfig from './env';

// 统一提供 Prisma CLI 的配置入口，避免 schema 路径和数据源配置分散在各处。
export default defineConfig({
  // 指定 Prisma schema 文件位置，供 generate、studio 等命令加载模型定义。
  schema: 'prisma/schema.prisma',
  datasource: {
    // 复用项目环境配置中的数据库连接地址，保持 Prisma 与运行时配置一致。
    url: envConfig.database.url,
  },
});
