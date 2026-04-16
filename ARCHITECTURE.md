# 项目架构图

## 系统总览

```mermaid
flowchart LR
    U[用户浏览器]

    subgraph FE[frontend]
        Vite[Vite Dev Server\n开发态]
        React[React 18 + React Router + Ant Design\nfrontend/src]
        Dist[构建产物\nfrontend/dist]
    end

    subgraph BE[service]
        Nest[NestJS 应用\nservice/src/main.ts]
        Proxy[ProxyVite 模块\n页面渲染 + 代理]
        Business[Business 模块\n示例业务接口]
        DBModule[Database 模块]
        Prisma[PrismaService]
        PgPool[pg Pool]
        Repo[TestSettingRepository]
    end

    API[外部业务 API\nPROXY_API]
    PG[(PostgreSQL)]

    U -->|开发态页面/资源| Nest
    Nest --> Proxy
    Proxy -->|HTML / 资源代理| Vite
    Vite --> React

    U -->|构建态页面/资源| Nest
    Proxy -->|EJS + manifest| Dist

    U -->|/app/.../proxy/api/*| Nest
    Proxy -->|pathRewrite: /api| API

    U -->|/app/.../proxy/business/test| Nest
    Nest --> Business
    Business --> DBModule
    DBModule --> Prisma
    DBModule --> PgPool
    DBModule --> Repo
    Repo --> Prisma
    Repo --> PgPool
    Prisma --> PG
    PgPool --> PG
```

## 构建与离线镜像流程

```mermaid
flowchart TD
    RootBuild["根脚本<br/>npm run build:development 或 build:production"]
    BuildJS["build.js"]
    FrontendBuild["frontend 构建"]
    ServiceBuild["service 构建<br/>nest build + tsc-alias"]
    DistOut["dist/out"]
    Archive["tar.gz 归档"]
    Dockerfile["dist/Dockerfile"]
    DockerBuild["dockerBuild.js"]
    Image["Docker 镜像"]

    RootBuild --> BuildJS
    BuildJS --> FrontendBuild
    BuildJS --> ServiceBuild
    FrontendBuild --> DistOut
    ServiceBuild --> DistOut
    DistOut --> Archive
    BuildJS --> Dockerfile
    BuildJS --> DockerBuild
    Archive --> DockerBuild
    Dockerfile --> DockerBuild
    DockerBuild --> Image
```

## 关键说明

- 开发态由 `service` 充当前端入口和 API 入口，HTML 与静态资源通过 `ProxyViteService` 转发到本地 Vite。
- 构建态由 `service` 直接托管 `frontend/dist`，并通过 `manifest.json` 注入前端资源。
- 数据库访问统一收敛在 `DatabaseModule`，其中 `PrismaService` 负责 ORM 主路径，`pg Pool` 负责健康检查和复杂 SQL 下钻。
- 根目录 `build.js` 会同时产出前后端打包结果，并生成可用于 Docker 离线分发的归档、`Dockerfile` 和 `docker-compose.yml`。
