import './index.less';
import reactImg from '@/assets/react.svg';
import { getPublicPath } from '@/tools/utils';
import { getHealth } from '@/api/common';
import { useEffect } from 'react';

const Home = () => {
  useEffect(() => {
    getHealth();
  });
  return (
    <div>
      <img width={200} height={200} src={reactImg} alt="" />
      <img width={200} height={200} src={getPublicPath('logo.png')} alt="" />
      <img width={200} height={200} src={getPublicPath('Turret10.png')} alt="" />
      home
    </div>
  );
};

export default Home;
