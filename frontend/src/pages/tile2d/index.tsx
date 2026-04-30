import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './index.less';

// 二维瓦片地图配置
const TILE2D_MAP = {
  baseSourceId: 'tile2d-amap-base',
  baseLayerId: 'tile2d-amap-layer',
  vectorSourceId: 'tile2d-data-source',
  fillLayerId: 'tile2d-data-fill',
  lineLayerId: 'tile2d-data-line',
  circleLayerId: 'tile2d-data-circle',
  sourceLayer: 'data',
  center: [114.22215277777778, 22.6875] as [number, number],
  zoom: 14,
  minZoom: 3,
  maxZoom: 18,
  amapTiles: [
    'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    'https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    'https://webrd03.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    'https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
  ],
  dataTiles: [
    `${window.location.origin}${__APP_PROXY_PREFIX__}/tiles/data/{z}/{x}/{y}.pbf?crs=gcj02`,
  ],
};

function registerVectorLayers(map: maplibregl.Map) {
  if (!map.getSource(TILE2D_MAP.vectorSourceId)) {
    map.addSource(TILE2D_MAP.vectorSourceId, {
      type: 'vector',
      tiles: TILE2D_MAP.dataTiles,
      minzoom: 0,
      maxzoom: 22,
    });
  }

  // 同时准备面、线、点图层，避免未知几何类型时页面看起来像空白。
  if (!map.getLayer(TILE2D_MAP.fillLayerId)) {
    map.addLayer({
      id: TILE2D_MAP.fillLayerId,
      type: 'fill',
      source: TILE2D_MAP.vectorSourceId,
      'source-layer': TILE2D_MAP.sourceLayer,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: {
        'fill-color': '#1f6feb',
        'fill-opacity': 0.28,
      },
    });
  }

  if (!map.getLayer(TILE2D_MAP.lineLayerId)) {
    map.addLayer({
      id: TILE2D_MAP.lineLayerId,
      type: 'line',
      source: TILE2D_MAP.vectorSourceId,
      'source-layer': TILE2D_MAP.sourceLayer,
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: {
        'line-color': '#ff7a00',
        'line-width': 2,
      },
    });
  }

  if (!map.getLayer(TILE2D_MAP.circleLayerId)) {
    map.addLayer({
      id: TILE2D_MAP.circleLayerId,
      type: 'circle',
      source: TILE2D_MAP.vectorSourceId,
      'source-layer': TILE2D_MAP.sourceLayer,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-color': '#d7263d',
        'circle-radius': 5,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
      },
    });
  }
}

const Tile2D = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    // 首版直接以内联 style 初始化高德底图。
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      center: TILE2D_MAP.center,
      zoom: TILE2D_MAP.zoom,
      minZoom: TILE2D_MAP.minZoom,
      maxZoom: TILE2D_MAP.maxZoom,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          [TILE2D_MAP.baseSourceId]: {
            type: 'raster',
            tiles: TILE2D_MAP.amapTiles,
            tileSize: 256,
          },
        },
        layers: [
          {
            id: TILE2D_MAP.baseLayerId,
            type: 'raster',
            source: TILE2D_MAP.baseSourceId,
          },
        ],
      },
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => registerVectorLayers(map));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="tile2d-page">
      <div ref={mapContainerRef} className="tile2d-map" />
    </div>
  );
};

export default Tile2D;
