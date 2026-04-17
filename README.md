# nest-vite-template

全栈模板项目，包含：

- `frontend`：React 18 + Vite + React Router + Ant Design
- `service`：NestJS 11 + Prisma 7 + PostgreSQL
- 根目录构建脚本：统一完成前后端构建、归档、Docker 镜像打包

架构图见：[architecture-diagram.png](/Users/lcc/my/nest-vite-template/architecture-diagram.png)

## 1. 项目特点

- 前后端分目录开发，根目录统一调度
- 开发态由 `service` 代理前端资源与业务 API
- 构建态由 `service` 直接托管 `frontend/dist`
- 数据库访问同时支持 Prisma 和原生 `pg`
- 支持打包为离线分发的 Docker 镜像归档

## 2. 目录结构

```text
nest-vite-template/
├── frontend/                  前端应用
│   ├── src/                   React 源码
│   ├── public/                前端静态资源
│   └── vite.config.ts         Vite 配置
├── service/                   后端应用
│   ├── src/                   Nest 源码
│   │   ├── modules/           业务模块与代理模块
│   │   ├── database/          数据库接入、健康检查、repository
│   │   ├── logger/            日志实现与日志策略
│   │   ├── interceptor/       响应包装与异常过滤
│   │   └── view/              EJS 页面模板
│   ├── prisma/                Prisma schema
│   ├── public/                service 本地静态资源
│   ├── scripts/               开发启动、Prisma 生成等脚本
│   └── env.ts                 运行时配置入口
├── build.js                   根目录构建与归档脚本
├── dockerBuild.js             Docker 镜像构建与导出脚本
├── ARCHITECTURE.md            架构图
└── README.md                  项目说明
```

## 3. 运行模式

### 3.1 开发态

开发态的核心特征：

- `frontend` 使用 Vite Dev Server
- `service` 作为统一入口
- 页面资源、HMR WebSocket 由 `service` 代理到本地 Vite
- 业务接口通过 `service` 暴露

典型访问流：

1. 浏览器访问 `service`
2. `service` 根据前端路由前缀接管请求
3. HTML 与静态资源由 `ProxyViteService` 转发给 Vite
4. `/proxy/api/*` 请求由 `service` 继续转发到外部业务 API

### 3.2 构建态

构建态的核心特征：

- `frontend` 先输出 `frontend/dist`
- `service` 启动时读取 `manifest.json`
- 页面资源由 `service` 直接托管，不再依赖 Vite
- `start:*` 运行的是 `service/dist/src/main`

## 4. 环境与配置

`service/env.ts` 是后端运行时配置的统一入口，负责：

- 加载 `.env` 与 `.env.<NODE_ENV>`
- 推导仓库根目录、`service` 根目录、前端构建目录
- 合并默认值、环境变量覆盖和 `SERVICE_ENV_CONFIG`

### 4.1 关键配置项

- `SERVICE_PORT`：Nest 服务端口，默认 `3000`
- `FRONTEND_PORT`：Vite 开发端口，默认 `3100`
- `ROUTER_PREFIX`：前端路由前缀，默认 `/app/<package-name>`
- `PROXY_PREFIX`：代理前缀，默认 `${ROUTER_PREFIX}/proxy`
- `PROXY_API`：外部业务 API 地址
- `DATABASE_URL`：PostgreSQL 连接串
- `LOG_DIR` / `LOG_LEVEL` / `LOG_FILE_PREFIX` / `LOG_TO_CONSOLE`

### 4.2 数据库配置

后端固定使用 PostgreSQL，数据库相关配置集中在：

- `service/prisma/schema.prisma`
- `service/src/database/`
- `service/env.ts`

当前示例模型：

- `TestSetting`

当前示例数据访问封装：

- [`TestSettingRepository`](/Users/lcc/my/nest-vite-template/service/src/database/repositories/test-setting.repository.ts)

## 5. 常用命令

### 5.1 安装依赖

```bash
pnpm install
pnpm -C ./service install
pnpm -C ./frontend install
```

或直接：

```bash
npm run install:all
```

### 5.2 前端命令

```bash
npm --prefix ./frontend run dev:development
npm --prefix ./frontend run build:development
```

### 5.3 后端命令

```bash
npm --prefix ./service run dev:development
npm --prefix ./service run build:development
npm --prefix ./service run start:development
```

### 5.4 数据库命令

```bash
npm --prefix ./service run db:generate
npm --prefix ./service run db:studio
```

### 5.5 根目录命令

```bash
npm run build:development
npm run build:production
npm run buildDocker
```

## 6. 构建与打包流程

根目录 `build.js` 会完成以下事情：

1. 清理根目录 `dist/`
2. 构建 `frontend`
3. 构建 `service`
4. 将前后端构建产物与运行文件复制到 `dist/out`
5. 生成启动脚本 `dist/out/bin/start.sh`
6. 打包为 `tar.gz`
7. 生成 `dist/Dockerfile`
8. 生成 `dist/docker-compose.yml`
9. 调用 `dockerBuild.js` 构建并导出镜像

### 6.1 Docker 构建链路

`dockerBuild.js` 的职责：

- 检查基础镜像是否存在
- 必要时拉取基础镜像
- 基于 `dist/Dockerfile` 构建镜像
- 导出镜像为 `tar.gz`

`dist/Dockerfile` 的镜像构建步骤包括：

1. 解压打包产物
2. 安装 `service` 依赖
3. 执行 Prisma Client 生成
4. `pnpm prune --prod`
5. 安装 `pm2`

## 7. 后端架构说明

### 7.1 模块划分

- `AppModule`
  - 聚合 `BusinessModules`
  - 聚合 `ProxyViteModules`

- `ProxyViteModules`
  - 页面渲染
  - Vite 开发代理
  - 外部 API 代理
  - 健康检查与环境信息接口

- `BusinessModules`
  - 示例业务接口
  - 引入 `DatabaseModule`

- `DatabaseModule`
  - `PrismaService`
  - `postgresPoolProvider`
  - `DatabaseHealthService`
  - `TestSettingRepository`

### 7.2 请求链路

- 页面请求
  - 开发态：`service` -> Vite
  - 构建态：`service` -> `frontend/dist`

- 外部 API 请求
  - 浏览器 -> `service /proxy/api/*` -> 外部 API

- 示例业务请求
  - 浏览器 -> `service /proxy/business/test` -> `BusinessService`

- 数据库健康检查
  - 浏览器 -> `/health/database` -> `DatabaseHealthService` -> Prisma / pg pool

### 7.3 日志与响应处理

- `app-logger.ts`：统一日志输出
- `log-policy.ts`：请求日志与错误日志策略
- `http-response.interceptor.ts`：统一响应包装
- `http-exception.filter.ts`：统一异常输出

## 8. 前端架构说明

### 8.1 技术栈

- React 18
- Vite 8
- React Router 6
- Ant Design 6
- `@deepinnet/model-context`

### 8.2 入口结构

- `src/main.tsx`：挂载 React 根节点
- `src/App.tsx`
  - 挂载 `ConfigProvider`
  - 挂载 `ModelProvider`
  - 挂载 `RouterProvider`
- `src/router/index.tsx`
  - 定义 `/home`
  - 根据后端注入的 `__APP_ROUTER_BASENAME__` 设置 `basename`

### 8.3 Alias 约定

前端 `@/*` 指向 `frontend/src/*`，由：

- `frontend/tsconfig.json`
- `frontend/tsconfig.app.json`
- `frontend/vite.config.ts` 中的 `resolve.tsconfigPaths = true`

共同支持。

## 9. 测试与质量工具

### 9.1 后端

- `jest.config.cjs`：单测配置
- `test/jest-e2e.config.cjs`：e2e 配置
- `ts-jest`：TypeScript 测试支持

### 9.2 代码质量

根目录统一维护：

- ESLint
- Prettier

常用命令：

```bash
npm run lint
npm run format
npm run format:check
```

## 10. 适合二次开发的入口

如果你要基于这个模板继续开发，通常优先改这些地方：

- 新增页面：`frontend/src/pages/`
- 新增前端路由：`frontend/src/router/index.tsx`
- 新增后端模块：`service/src/modules/`
- 新增数据库模型：`service/prisma/schema.prisma`
- 新增数据库封装：`service/src/database/repositories/`
- 调整代理目标：`PROXY_API`
- 调整路由前缀：`ROUTER_PREFIX`

## 11. 当前模板的边界

- 当前只内置一个简单的示例业务模块
- 健康检查接口返回较轻量，偏模板示例
- 数据库模型和 repository 目前主要用于演示接入方式
- Docker 打包偏离线分发场景，适合内网或交付型部署

## 12. 建议阅读顺序

第一次接手这个项目，建议按顺序阅读：

1. [`ARCHITECTURE.md`](/Users/lcc/my/nest-vite-template/ARCHITECTURE.md)
2. [`package.json`](/Users/lcc/my/nest-vite-template/package.json)
3. [`build.js`](/Users/lcc/my/nest-vite-template/build.js)
4. [`service/env.ts`](/Users/lcc/my/nest-vite-template/service/env.ts)
5. [`service/src/main.ts`](/Users/lcc/my/nest-vite-template/service/src/main.ts)
6. [`service/src/modules/proxyVite/proxy.controller.ts`](/Users/lcc/my/nest-vite-template/service/src/modules/proxyVite/proxy.controller.ts)
7. [`frontend/src/App.tsx`](/Users/lcc/my/nest-vite-template/frontend/src/App.tsx)
