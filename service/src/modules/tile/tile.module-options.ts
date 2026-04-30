import type { TileModuleOptions } from '@deepinnet/service-mvt-middleware';
import type { Pool } from 'pg';
import { TILE_LAYER_NAME, TILE_PROPERTY_WHITELIST, TILE_SOURCE_OBJECT } from './tile.constants';

// geom 表固定产出 data 图层，二维使用 geometry，三维使用 geometry3d。
export function createGeomTileModuleOptions(postgresPool: Pool): TileModuleOptions {
  return {
    layers: [
      {
        layer: TILE_LAYER_NAME,
        sourceType: 'table',
        sourceObject: TILE_SOURCE_OBJECT,
        idField: 'id',
        geomField: 'geometry',
        geom3dField: 'geometry3d',
        propertyWhitelist: [...TILE_PROPERTY_WHITELIST],
        supportedOutputCrs: ['4326', 'gcj02'],
      },
    ],
    database: {
      pool: postgresPool,
    },
    defaults: {
      sourceCrs: '4326',
      defaultOutputCrs: '4326',
    },
  };
}
