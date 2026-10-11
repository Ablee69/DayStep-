import { defineConfig } from '@tarojs/cli';

export default defineConfig({
  projectName: 'daystep-mobile',
  date: '2026-10-10',
  designWidth: 390,
  deviceRatio: { 390: 1 },
  sourceRoot: 'src',
  outputRoot: process.env.TARO_ENV === 'h5' ? 'dist/h5' : 'dist/weapp',
  framework: 'react',
  compiler: 'webpack5',
  mini: {},
  h5: { publicPath: '/', staticDirectory: 'static' },
});
