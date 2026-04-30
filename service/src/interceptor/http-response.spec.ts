import envConfig from '@services/env';
import { shouldUseStandardResponse } from './http-response';

describe('shouldUseStandardResponse', () => {
  it('对健康检查保持统一报文', () => {
    expect(shouldUseStandardResponse('/health')).toBe(true);
  });

  it('对普通业务接口保持统一报文', () => {
    expect(shouldUseStandardResponse(`${envConfig.proxyPrefix}/business/test`)).toBe(true);
  });

  it('对二维瓦片接口跳过统一报文', () => {
    expect(shouldUseStandardResponse(`${envConfig.proxyPrefix}/tiles/data/0/0/0.pbf`)).toBe(
      false,
    );
  });

  it('对三维瓦片接口跳过统一报文', () => {
    expect(shouldUseStandardResponse(`${envConfig.proxyPrefix}/tiles-3d/data/0/0/0.pbf`)).toBe(
      false,
    );
  });

  it('对瓦片 metadata 接口跳过统一报文', () => {
    expect(shouldUseStandardResponse(`${envConfig.proxyPrefix}/tiles/data/metadata`)).toBe(
      false,
    );
  });
});
