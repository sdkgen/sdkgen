const path = require("path");
const webpack = require("webpack");
const OfflinePlugin = require("offline-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const FaviconsWebpackPlugin = require("favicons-webpack-plugin");
const ImageMinPlugin = require("imagemin-webpack-plugin").default;
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const ManifestPlugin = require("webpack-manifest-plugin");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

const shouldBuildForProduction = process.env.NODE_ENV === "production";
const hash = shouldBuildForProduction ? "[chunkhash]" : "[name]";

const devServerHost = "localhost";

const port = 4545;
const defaultServerPort = 8000;
const title = "Anapatrix";
const rootDir = __dirname;

// LOADERS
const cssLoader = (modules = false) => ({
	loader: "css-loader",
	options: {
		modules: modules
			? {
					localIdentName: "[path].[name].[local]",
			  }
			: false,
		importLoaders: 1,
		// minimize: shouldBuildForProduction,
	},
});

const postCssLoader = {
	loader: "postcss-loader",
	options: {
		ident: "postcss",
	},
};

const sassLoader = rootDir => ({
	loader: "sass-loader",
	options: {
		includePaths: [resolver("src/resources/styles")],
	},
});

const styleLoader = "style-loader";

// MANIFEST
// const manifestBase = rootDir => require(path.resolve(rootDir, "public/manifest.json"));

//HELPER

function resolver(desiredPath) {
	return path.join(__dirname, desiredPath);
}

// console.log("KEVIN", rootDir, __dirname);
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
		publicPath: "/playground",
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
				test: /\*.html$/,
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
				test: /react-icons.*\.js$/,
				loader: "ts-loader",
				options: {
					transpileOnly: true,
				},
			},
			{
				test: /\.tsx?$/,
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
				test: /\.css/,
				use: [styleLoader, cssLoader(false), postCssLoader],
			},
			{
				test: /\.scss$/,
				resolve: {
					extensions: [".scss", ".sass"],
				},
				use: [styleLoader, cssLoader(true), postCssLoader, sassLoader(rootDir)],
			},
			{
				test: /\.woff(2)?(\?v=[0-9].[0-9].[0-9])?$/,
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
				test: /\.(ttf|otf|eot)(\?v=[0-9].[0-9].[0-9])?$/,
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
				test: /\.(jpe?g|png|gif|svg)$/i,
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
		new ForkTsCheckerWebpackPlugin({
			tsconfig: resolver("tsconfig.json"),
			tslint: resolver("tslint.json"),
		}),
		new webpack.ExtendedAPIPlugin(),
		new webpack.DefinePlugin({
			"process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
			"process.env.SERVER_PORT": JSON.stringify(process.env.SERVER_PORT || defaultServerPort),
			"process.env.ENVIRONMENT": JSON.stringify(process.env.ENVIRONMENT || "BROWSER"),
			"process.env.CI_COMMIT_REF_NAME": JSON.stringify(
				process.env.CI_COMMIT_REF_NAME || "non-master-branch-name",
			),
		}),
		new HtmlWebpackPlugin({
			title,
			filename: "index.html",
			template: resolver("src/public/index.html"),
		}),
		new FaviconsWebpackPlugin({
			logo: resolver("src/public/favicon.png"),
		}),
		new ManifestPlugin({
			fileName: "manifest.json",
			seed: resolver("src/public/manifest.json"),
			generate: (seed, files) => {
				const manifestFiles = files.reduce(function(manifest, file) {
					manifest[file.name] = file.path;
					return manifest;
				}, seed);
				return {
					files: manifestFiles,
				};
			},
		}),
		new MonacoWebpackPlugin({
			// available options are documented at https://github.com/Microsoft/monaco-editor-webpack-plugin#options
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

	externals: [
		{
			["../xlsx.js"]: "var _XLSX",
		},
	],

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
