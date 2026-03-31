import { ModelProvider } from '@deepinnet/model-context';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import routes from './router';
import useCommon from '@/models/useCommon';

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890FF',
        },
      }}
    >
      <ModelProvider
        models={{
          useCommon,
        }}
      >
        <RouterProvider router={routes} />
      </ModelProvider>
    </ConfigProvider>
  );
}

export default App;
