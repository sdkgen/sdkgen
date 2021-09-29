/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
const path = require("path");

const webpack = require("webpack");
const OfflinePlugin = require("offline-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const FaviconsWebpackPlugin = require("favicons-webpack-plugin");
const ImageMinPlugin = require("imagemin-webpack-plugin").default;
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const { WebpackManifestPlugin } = require("webpack-manifest-plugin");

const shouldBuildForProduction = process.env.NODE_ENV === "production";
const hash = shouldBuildForProduction ? "[chunkhash]" : "[name]";

const devServerHost = "localhost";

const port = 4545;
const defaultServerPort = 8000;
const title = "sdkgen playground";
const rootDir = __dirname;

// LOADERS
function cssLoader(modules = false) {
  return {
    loader: "css-loader",
    options: {
      modules: modules
        ? {
            localIdentName: "[path].[name].[local]",
          }
        : false,
      importLoaders: 1,
    },
  };
}

const postCssLoader = {
  loader: "postcss-loader",
  options: {
    postcssOptions: {
      ident: "postcss",
      plugins: [require("postcss-preset-env")],
    },
  },
};

function sassLoader() {
  return {
    loader: "sass-loader",
    options: {
      sassOptions: {
        includePaths: [resolver("src/resources/styles")],
      },
    },
  };
}

const styleLoader = "style-loader";

// HELPER

function resolver(desiredPath) {
  return path.join(__dirname, desiredPath);
}

/**
 * @type webpack.Configuration
 */
module.exports = {
  mode: shouldBuildForProduction ? "production" : "development",

  target: "web",

  entry: {
    main: resolver("src/index"),
    vendor: ["react", "react-dom"],
  },

  context: rootDir,

  output: {
    pathinfo: false,
    publicPath: "/playground/",
    filename: shouldBuildForProduction ? "prod.[name].[hash].js" : "dev.[name].js",
    chunkFilename: shouldBuildForProduction ? `prod.chunk.${hash}.js` : `dev.chunk.${hash}.js`,
    path: resolver("dist"),
  },

  devtool: shouldBuildForProduction ? undefined : "inline-module-source-map",

  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
    alias: {
      assets: resolver("src/assets"),
      components: resolver("src/components"),
      configuration: resolver("src/configuration"),
      containers: resolver("src/containers"),
      helpers: resolver("src/helpers"),
      resources: resolver("src/resources"),
      pages: resolver("src/pages"),
      public: resolver("src/public"),
      stores: resolver("src/stores"),
      styles: resolver("src/styles"),
      types: resolver("src/types"),
      services: resolver("src/services"),
    },
  },

  module: {
    rules: [
      {
        test: /\*.html$/u,
        use: [
          {
            loader: "html-loader",
            options: {
              interpolate: true,
              minimize: true,
            },
          },
        ],
      },
      {
        test: /react-icons.*\.js$/u,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
        },
      },
      {
        test: /\.tsx?$/u,
        use: [
          ...(shouldBuildForProduction ? [] : ["cache-loader"]),
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
              experimentalWatchApi: true,
            },
          },
        ],
      },
      {
        test: /\.css/u,
        use: [styleLoader, cssLoader(false), postCssLoader],
      },
      {
        test: /\.scss$/u,
        resolve: {
          extensions: [".scss", ".sass"],
        },
        use: [styleLoader, cssLoader(true), postCssLoader, sassLoader(rootDir)],
      },
      {
        test: /\.woff2?(?:\?v=[0-9].[0-9].[0-9])?$/u,
        use: [
          {
            loader: "url-loader",
            options: {
              mimetype: "application/font-woff",
            },
          },
        ],
      },
      {
        test: /\.(?:ttf|otf|eot)(?:\?v=[0-9].[0-9].[0-9])?$/u,
        loader: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[hash].[ext]",
            },
          },
        ],
      },
      {
        test: /\.(?:jpe?g|png|gif|svg)$/iu,
        use: [
          {
            loader: "file-loader",
            options: {
              hash: "sha512",
              digest: "hex",
              name: "[name].[hash].[ext]",
            },
          },
        ],
      },
    ],
  },

  plugins: [
    new ForkTsCheckerWebpackPlugin(),
    new webpack.ExtendedAPIPlugin(),
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
      "process.env.SERVER_PORT": JSON.stringify(process.env.SERVER_PORT || defaultServerPort),
      "process.env.ENVIRONMENT": JSON.stringify(process.env.ENVIRONMENT || "BROWSER"),
    }),
    new HtmlWebpackPlugin({
      title,
      filename: "index.html",
      template: resolver("src/public/index.html"),
    }),
    new FaviconsWebpackPlugin({
      logo: resolver("src/public/favicon.png"),
    }),
    new WebpackManifestPlugin({
      fileName: "manifest.json",
      seed: resolver("src/public/manifest.json"),
      generate: (seed, files) => {
        const manifestFiles = files.reduce((manifest, file) => {
          manifest[file.name] = file.path;
          return manifest;
        }, seed);

        return {
          files: manifestFiles,
        };
      },
    }),
    new MonacoWebpackPlugin({
      // Available options are documented at https://github.com/Microsoft/monaco-editor-webpack-plugin#options
      languages: ["json"],
    }),
    ...(shouldBuildForProduction
      ? [
          new webpack.HashedModuleIdsPlugin(),

          new webpack.optimize.OccurrenceOrderPlugin(),
          new ImageMinPlugin({
            gifsicle: {
              interlaced: true,
            },
            optipng: {
              enable: true,
              optimizationLevel: 7,
            },
            pngquant: {
              quality: "65-90",
              speed: 4,
            },
            mozjpeg: {
              progressive: true,
              quality: 65,
            },
          }),
          new OfflinePlugin({
            ServiceWorker: {
              events: true,
              minify: false,
            },
          }),
        ]
      : []),
  ],

  node: {
    fs: "empty",
  },

  optimization: {
    minimize: shouldBuildForProduction,
    splitChunks: {
      chunks: "all",
    },
  },

  devServer: {
    inline: true,
    port,
    host: devServerHost,
    historyApiFallback: true,
  },
};
