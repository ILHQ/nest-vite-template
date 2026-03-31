import axios from 'axios';
import { message } from 'antd';

// 创建实例
const request: any = axios.create({
  baseURL: '/api',
  timeout: 60000, // 超时时间（毫秒）
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.satoken = token;
    }
    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      config.headers['Tenant-Id'] = tenantId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 响应拦截器
request.interceptors.response.use(
  (response: any) => {
    if (response?.config?.needCheckSuccess) {
      return response.data;
    }
    if (response?.data?.success) {
      return response.data;
    } else {
      message.error(response?.data?.errorDesc);
      if (
        ['110', 'account_not_login', 'account_login_expire'].includes(response?.data?.errorCode)
      ) {
        localStorage.clear();
        location.href = '/login';
      }
      return Promise.reject(response?.data?.errorDesc);
    }
  },
  (error) => {
    // 可以统一提示错误
    console.error('请求出错：', error);
    // if (error.response) {
    //   const { status } = error.response;
    // }
    return Promise.reject(error);
  },
);

export default request;
