import envConfig from '@services/env';

export const TILE_LAYER_NAME = 'data';
export const TILE_SOURCE_OBJECT = 'public.geom';
export const TILE_PROPERTY_WHITELIST = ['name', 'color'] as const;
export const TILE_ROUTE_PREFIX = envConfig.proxyPrefix;
export const TILE_2D_ROUTE_PREFIX = `${TILE_ROUTE_PREFIX}/tiles/`;
export const TILE_3D_ROUTE_PREFIX = `${TILE_ROUTE_PREFIX}/tiles-3d/`;

// 瓦片接口会直接返回二进制或原始 metadata，需要跳过统一响应包装。
export function isTileRoutePath(pathname: string): boolean {
  return [TILE_2D_ROUTE_PREFIX, TILE_3D_ROUTE_PREFIX].some((routePrefix) =>
    pathname.startsWith(routePrefix),
  );
}
