import path from 'path';
import webpackNodeExternals from 'webpack-node-externals';
import Dotenv from 'dotenv-webpack';

export default {
  entry: './src/index.js',
  target: 'node',
  mode: 'production',
  externals: [webpackNodeExternals()],
  output: {
    filename: 'index.cjs',

    path: path.resolve(process.cwd(), 'dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new Dotenv({
      path: './.env',
      systemvars: true
    })
  ],
  optimization: {
    minimize: true
  },
  stats: {
    warningsFilter: /node_modules/
  }
};
