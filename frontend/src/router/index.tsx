import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import Home from '@/pages/home';

const routerBasename =
  __APP_ROUTER_BASENAME__ === '/' ? '/' : __APP_ROUTER_BASENAME__.replace(/\/$/, '');

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="home" replace />,
  },
  {
    path: '/home',
    element: <Home />,
  },
];

const router = createBrowserRouter(routes, {
  basename: routerBasename,
});

export default router;
