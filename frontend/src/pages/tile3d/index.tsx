import './index.less';
import DeepTwinsEngine3D from 'deeptwins-engine-3d';
import { useEffect } from 'react';

const Tile3d = () => {
  useEffect(() => {
    const map = new DeepTwinsEngine3D.Map('map3dContainer', {
      camera: {
        lng: 114.22215277777778,
        lat: 22.6875,
        alt: 1800,
        heading: 0,
        pitch: -60,
      },
    });
    map.setDefaultLayer(DeepTwinsEngine3D.DefaultBaseLayer.GAO_DE_IMG);

    const mvtVectorLoad = new DeepTwinsEngine3D.MvtVectorLoad(map, {
      url: `${window.location.origin}${__APP_PROXY_PREFIX__}/tiles-3d/data/{z}/{x}/{y}.pbf?crs=gcj02`,
      minzoom: 15,
      maxzoom: 17,
      maxCacheSize: 300,
    });

    const offTileLoad = mvtVectorLoad.on('tileLoad', async (tile) => {
      const { geoJson } = mvtVectorLoad.tileToGeoJSON(tile);
      console.log('geojson:', geoJson);

      const data = JSON.parse(JSON.stringify(geoJson));
      const layers = await new Promise((resolve) => {
        const layers = [];
        const create = (features) => {
          const layer = map.addGraphicLayer(
            {
              type: 'FeatureCollection',
              features,
            },
            {
              type: 'boxP',
              style: {
                color: (p) => p.color,
                dimensions: [7, 7, 7],
                scale: 1,
              },
            },
          );
          layers.push(layer);
        };
        const processChunk = () => {
          if (data.features.length === 0) {
            resolve(layers);
            return;
          }
          create(data.features.splice(0, 1000));
          setTimeout(processChunk, 0); // 让出主线程，下一帧继续
        };
        processChunk();
      });
      return layers;
    });

    return () => {
      offTileLoad.off();
      mvtVectorLoad.destroy();
      map.destroy();
    };
  }, []);

  return <div id="map3dContainer" />;
};

export default Tile3d;
