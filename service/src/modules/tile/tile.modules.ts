import { Module } from '@nestjs/common';
import { TileModule } from '@deepinnet/service-mvt-middleware';
import type { Pool } from 'pg';
import { DatabaseModule } from '@/database/database.module';
import { POSTGRES_POOL } from '@/database/database.constants';
import { TILE_ROUTE_PREFIX } from './tile.constants';
import { createGeomTileModuleOptions } from './tile.module-options';

@Module({
  imports: [
    DatabaseModule,
    TileModule.forRootAsync({
      imports: [DatabaseModule],
      routePrefix: TILE_ROUTE_PREFIX,
      controllers: {
        tile: true,
        tile3d: true,
        metadata: true,
        health: false,
      },
      inject: [POSTGRES_POOL],
      useFactory: (postgresPool: Pool) => createGeomTileModuleOptions(postgresPool),
    }),
  ],
})
export class TileModules {}
