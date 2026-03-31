export default {
  plugins: {
    // 'postcss-pxtorem': {
    //   // 同.env VITE_ROOT_VALUE
    //   // rootValue: 198,
    //   rootValue: ({ file }) => {
    //     return file.indexOf('adaption-ultra.less') > -1 ? 500 : 198;
    //   },
    //   // 允许 px 转换为 rem 精确到小数点后几位
    //   unitPrecision: 5,
    //   // 存储哪些将被转换的属性列表，这里设置为 ['*'] 全部。
    //   propList: ['*'],
    //   // 对 css 选择器进行忽略的数组。
    //   selectorBlackList: [],
    //   // 媒体查询( @media screen 之类的)中不生效
    //   mediaQuery: false,
    //   // px 绝对值小于 0 的不会被转换
    //   minPixelValue: 0,
    //   exclude: (file) => {
    //     // 转换绝对路径
    //     file = file.split(path.sep).join('/');
    //     // 对路径下进行转换
    //     return file.indexOf('/src/pages/') < 0;
    //   },
    // },
    tailwindcss: {},
    autoprefixer: {},
  },
};
