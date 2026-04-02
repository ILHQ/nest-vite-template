import request from '@/request';

// 健康检查
export const getHealth = () => request.get('/health');
