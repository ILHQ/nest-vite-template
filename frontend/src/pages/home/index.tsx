import './index.less';
import reactImg from '@/assets/react.svg';

const routerBasename =
  __APP_ROUTER_BASENAME__ === '/' ? '' : __APP_ROUTER_BASENAME__.replace(/\/$/, '');

const Home = () => {
  return (
    <div>
      <img width={200} height={200} src={reactImg} alt="" />
      <img width={200} height={200} src={`${routerBasename}/public/vite.svg`} alt="" />
      <img width={200} height={200} src={`${routerBasename}/public/Turret10.png`} alt="" />
      home
    </div>
  );
};

export default Home;
