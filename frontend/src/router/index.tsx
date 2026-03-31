import { createBrowserRouter, Navigate } from 'react-router-dom';
import Home from '@/pages/home';

const routerBasename =
  __APP_ROUTER_BASENAME__ === '/' ? '/' : __APP_ROUTER_BASENAME__.replace(/\/$/, '');

const router = (createBrowserRouter as any)(
  [
    {
      path: '/',
      element: <Navigate to="home" replace />,
    },
    {
      path: '/home',
      element: <Home />,
    },
  ],
  {
    basename: routerBasename,
  },
);

export default router;
