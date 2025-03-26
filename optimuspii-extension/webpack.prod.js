const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = (env, argv) => {
  const commonConfig = common(env, argv);
  
  return merge(commonConfig, {
    mode: 'production',
    devtool: 'source-map',
    output: {
      path: path.resolve(__dirname, `build/${env.browser || 'chromium'}`),
      filename: '[name].js',
      clean: true // Clean the output directory before emit
    },
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false,
            },
            compress: {
              drop_console: true,
              drop_debugger: true,
            }
          },
          extractComments: false,
        }),
        new CssMinimizerPlugin(),
      ],
      splitChunks: {
        chunks: 'all',
        name: 'vendor'
      }
    },
    performance: {
      hints: 'warning',
      maxAssetSize: 244 * 1024, // 244 KiB
      maxEntrypointSize: 244 * 1024
    }
  });
};