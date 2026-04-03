// Get public path
export function getPublicPath(path: string): string {
  const baseRouter =
    __APP_ROUTER_BASENAME__ === '/' ? '' : __APP_ROUTER_BASENAME__.replace(/\/$/, '');
  const normalizedPath = path.replace(/^\/+/, '');
  return `${baseRouter}/public/${normalizedPath}`;
}
