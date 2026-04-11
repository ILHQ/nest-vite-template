import request, { type StandardResponse } from '@/request';

// 测试接口
export const getTest = () => request.get<StandardResponse<{ message: string }>>('/business/test');
