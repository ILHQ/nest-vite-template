import './index.less';
import reactImg from '@/assets/react.svg';
import { getPublicPath } from '@/tools/utils';

const Home = () => {
  return (
    <div>
      <img width={200} height={200} src={reactImg} alt="" />
      <img width={200} height={200} src={getPublicPath('vite.svg')} alt="" />
      <img width={200} height={200} src={getPublicPath('Turret10.png')} alt="" />
      home
    </div>
  );
};

export default Home;
