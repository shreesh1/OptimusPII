const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');

module.exports = (env, argv) => {
  const commonConfig = common(env, argv);
  
  return merge(commonConfig, {
    mode: 'development',
    devtool: 'inline-source-map',
    watch: true,
    output: {
      path: path.resolve(__dirname, `dist/${env.browser || 'chromium'}`),
    }
  });
};
