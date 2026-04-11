import { Injectable } from '@nestjs/common';

@Injectable()
export class BusinessService {
  // 测试
  test(): string {
    return 'test success';
  }
}
