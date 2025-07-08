const { override, addBabelPreset, addBabelPlugin } = require('customize-cra');

module.exports = override(
  addBabelPreset('@babel/preset-env'),
  addBabelPlugin('@babel/plugin-transform-runtime'),
  (config) => {
    // 添加对 node_modules 中 ES6+ 代码的处理
    config.module.rules.push({
      test: /\.(js|jsx|ts|tsx)$/,
      include: [
        /node_modules\/@antv/,
        /node_modules\/@ant-design/,
      ],
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          plugins: ['@babel/plugin-transform-runtime']
        }
      }
    });

    // 添加对 @antv/g2 的特殊处理
    config.resolve.alias = {
      ...config.resolve.alias,
      '@antv/g2': '@antv/g2/dist/g2.min.js'
    };

    return config;
  }
); 