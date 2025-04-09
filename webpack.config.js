import path from "path";
import webpackNodeExternals from "webpack-node-externals";
import Dotenv from "dotenv-webpack";

export default {
  entry: "./src/index.js", // Entry point updated to src/index.js
  target: "node",
  mode: "production", // Use production mode for optimizations
  externals: [webpackNodeExternals()], // Exclude node_modules from the bundle
  output: {
    filename: "index.cjs",
    // eslint-disable-next-line no-undef
    path: path.resolve(process.cwd(), "dist"),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"], // Transpile modern JavaScript
          },
        },
      },
    ],
  },
  plugins: [
    new Dotenv({
      path: "./.env.development", // Use .env.sample file
      systemvars: true, // Allow system variables to override
    }),
  ],
  optimization: {
    minimize: true, // Minify the output for production
  },
  stats: {
    warningsFilter: /node_modules/, // Suppress warnings from node_modules
  },
};
