import path from 'path';
import webpackNodeExternals from 'webpack-node-externals';
import Dotenv from 'dotenv-webpack';

export default {
  entry: './src/index.ts', // Entry point updated to src/index.ts
  target: 'node',
  mode: 'production', // Use production mode for optimizations
  externals: [webpackNodeExternals()], // Exclude node_modules from the bundle
  resolve: {
    extensions: ['.ts', '.js'] // Resolve TypeScript and JavaScript files
  },
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
            presets: ['@babel/preset-env'] // Transpile modern JavaScript
          }
        }
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader' // Use ts-loader for TypeScript files
      }
    ]
  },
  plugins: [
    new Dotenv({
      path: './.env.development', // Use .env.development file
      systemvars: true // Allow system variables to override
    })
  ],
  optimization: {
    minimize: true // Minify the output for production
  },
  stats: {
    warningsFilter: /node_modules/ // Suppress warnings from node_modules
  }
};
