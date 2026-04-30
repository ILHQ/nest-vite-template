import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TileService } from '@deepinnet/service-mvt-middleware';

process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/nest_vite_template_test';

jest.mock('@prisma/client', () => {
  class PrismaClient {
    async $connect(): Promise<void> {}

    async $disconnect(): Promise<void> {}

    async $queryRawUnsafe(): Promise<Array<{ alive: number }>> {
      return [{ alive: 1 }];
    }
  }

  return { PrismaClient };
});

jest.mock('@prisma/adapter-pg', () => {
  class PrismaPg {
    constructor(_: unknown) {}
  }

  return { PrismaPg };
});

jest.mock('pg', () => {
  class Pool {
    totalCount = 1;
    idleCount = 1;
    waitingCount = 0;

    async query(): Promise<{ rows: Array<{ alive: number }> }> {
      return { rows: [{ alive: 1 }] };
    }

    async end(): Promise<void> {}
  }

  return { Pool };
});

import { AppModule } from '@/modules/app.module';
import { ProxyViteController } from '@/modules/proxyVite/proxy.controller';

type ExpressRouteLayer = {
  route?: {
    path?: string;
  };
  handle?: {
    stack?: ExpressRouteLayer[];
  };
};

const TILE_PROXY_PREFIX = '/app/nest-vite-template/proxy';

function collectRoutePaths(routeLayers: ExpressRouteLayer[] = []): string[] {
  return routeLayers.flatMap((routeLayer) => {
    const currentPath = typeof routeLayer.route?.path === 'string' ? [routeLayer.route.path] : [];
    const nestedPaths = collectRoutePaths(routeLayer.handle?.stack ?? []);

    return [...currentPath, ...nestedPaths];
  });
}

describe('App health (e2e)', () => {
  let moduleFixture: TestingModule;
  let app: INestApplication;
  let proxyViteController: ProxyViteController;
  let tileService: TileService;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    proxyViteController = moduleFixture.get(ProxyViteController);
    tileService = moduleFixture.get(TileService);
  });

  afterEach(async () => {
    await app.close();
    await moduleFixture.close();
  });

  it('/health (GET)', async () => {
    const response = await proxyViteController.getHealth();

    expect(response).toEqual('hello');
  });

  it('/health/database (GET)', async () => {
    const response = await proxyViteController.getDatabaseHealth();

    expect(response).toEqual({
      status: 'ok',
      database: {
        driver: 'postgresql',
        orm: 'prisma',
        status: 'up',
        checkedAt: expect.any(String),
        pool: {
          min: 0,
          max: 10,
          total: 1,
          idle: 1,
          waiting: 0,
        },
      },
    });
  });

  it('注册二维、三维和 metadata 路由', () => {
    const expressApplication = app.getHttpAdapter().getInstance() as {
      router?: { stack?: ExpressRouteLayer[] };
    };
    const routePaths = collectRoutePaths(expressApplication.router?.stack ?? []);

    expect(routePaths).toEqual(
      expect.arrayContaining([
        `${TILE_PROXY_PREFIX}/tiles/:layer/:z/:x/:y.pbf`,
        `${TILE_PROXY_PREFIX}/tiles-3d/:layer/:z/:x/:y.pbf`,
        `${TILE_PROXY_PREFIX}/tiles/:layer/metadata`,
      ]),
    );
  });

  it('data 图层 metadata 正确', async () => {
    const metadata = await tileService.getLayerMetadata('data');

    expect(metadata).toEqual({
      layer: 'data',
      sourceType: 'table',
      sourceObject: 'public.geom',
      sourceCrs: '4326',
      defaultOutputCrs: '4326',
      supportedOutputCrs: ['4326', 'gcj02'],
      propertyWhitelist: ['name', 'color'],
      geom3dField: 'geometry3d',
    });
  });

  it('二维空瓦片返回 204', async () => {
    const tileResult = await tileService.getTile({
      layer: 'data',
      z: 0,
      x: 0,
      y: 0,
    });

    expect(tileResult.status).toBe(204);
    expect(tileResult.isEmpty).toBe(true);
  });

  it('三维空瓦片返回 204', async () => {
    const tile3dResult = await tileService.get3DTile({
      layer: 'data',
      z: 0,
      x: 0,
      y: 0,
    });

    expect(tile3dResult.status).toBe(204);
    expect(tile3dResult.isEmpty).toBe(true);
  });
});
