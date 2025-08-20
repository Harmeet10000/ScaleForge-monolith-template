import path from 'path';
import webpackNodeExternals from 'webpack-node-externals';
import Dotenv from 'dotenv-webpack';
import TerserPlugin from 'terser-webpack-plugin';

const isProduction = process.env.NODE_ENV === 'production';

export default {
  entry: './src/index.js',
  target: 'node',
  mode: 'production',
  devtool: 'source-map',
  externals: [
    webpackNodeExternals({
      allowlist: [/^@babel\/runtime/]
    })
  ],
  output: {
    filename: 'index.cjs',
    path: path.resolve(process.cwd(), 'dist'),
    clean: true,
    chunkFormat: 'commonjs'
  },
  resolve: {
    extensions: ['.js', '.json'],
    alias: {
      '@': path.resolve(process.cwd(), 'src')
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: { node: '18' },
                  modules: false
                }
              ]
            ],
            plugins: ['@babel/plugin-transform-runtime'],
            cacheDirectory: true
          }
        }
      }
    ]
  },
  plugins: [
    new Dotenv({
      path: './.env.development',
      systemvars: true,
      safe: false
    })
  ],
  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: isProduction,
            drop_debugger: isProduction
          },
          mangle: {
            keep_fnames: true
          }
        },
        extractComments: false
      })
    ],
    nodeEnv: 'production'
  },
  performance: {
    hints: isProduction ? 'warning' : false,
    maxAssetSize: 1000000,
    maxEntrypointSize: 1000000
  },
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false,
    warningsFilter: /node_modules/
  },
  cache: {
    type: 'filesystem'
  }
};
