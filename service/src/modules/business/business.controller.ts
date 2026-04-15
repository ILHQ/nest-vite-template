import { Controller, Get } from '@nestjs/common';
import { BusinessService } from './business.service';
import envConfig from '../../../env';

@Controller()
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  // 测试接口
  @Get(`${envConfig.proxyPrefix}/business/test`)
  proxyApi(): string {
    return this.businessService.test();
  }
}
