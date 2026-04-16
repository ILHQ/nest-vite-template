import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';

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

describe('App health (e2e)', () => {
  let moduleFixture: TestingModule;
  let proxyViteController: ProxyViteController;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    await moduleFixture.init();
    proxyViteController = moduleFixture.get(ProxyViteController);
  });

  afterEach(async () => {
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
});
