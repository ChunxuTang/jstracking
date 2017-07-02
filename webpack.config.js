const webpack = require('webpack');
const path = require('path');

const minimize
  = process.argv.indexOf('-p') !== -1 || process.argv.indexOf('--optimize-minimize') !== -1;

const plugins = [
  new webpack.LoaderOptionsPlugin({
    debug: !minimize,
    minimize
  })
];

if (minimize) {
  plugins.push(new webpack.optimize.UglifyJsPlugin({
    compress: {
      warnings: true
    },
    extractComments: true,
    sourceMap: true
  }));
}

module.exports = {
  context: path.resolve(__dirname, './src'),
  devtool: 'source-map',
  entry: {
    tracking: './tracking.js'
  },
  output: {
    path: path.resolve(__dirname, './build'),
    filename: `[name]${minimize ? '-min' : ''}.js`,
    sourceMapFilename: `[name]${minimize ? '-min' : ''}.js.map`
  },
  plugins,
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [{
          loader: 'babel-loader',
          options: { presets: ['env'] }
        }]
      }
    ]
  },
  devServer: {
    contentBase: './'
  }
};
