var sysPath = require("path")
var root = __dirname
var srcRoot = sysPath.join(root, "src")
var fs = require("fs")

var webpack = require("webpack")
var WebpackErrorNotificationPlugin = require("webpack-error-notification")

var isProd = process.env.NODE_ENV === "production"

module.exports = {
  context: srcRoot,

  entry: "index.js",

  output: {
    path: sysPath.join(root, "dist"),
    filename: "kefir-store" + (isProd ? ".min" : "") + ".js",
    library: "KefirStore",
    libraryTarget: "umd",
  },

  resolve: {
    root: srcRoot,
  },

  eslint: {
    failOnError: true,
    failOnWarning: true,
  },

  externals: (
    Object.keys(
      JSON.parse(
        fs.readFileSync("package.json")
      ).dependencies
    ).concat(
      /^lodash($|\/.+)/
    )
  ),

  module: {
    preLoaders: [
      {
        test: /\.js$/i,
        include: srcRoot,
        loader: "eslint",
      }
    ],

    loaders: [
      {
        test: /\.js$/i,
        include: srcRoot,
        loader: "babel",
      }
    ]
  },

  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    }),
  ].concat(
    !isProd ? [
      new WebpackErrorNotificationPlugin(),
    ] : [
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.OccurrenceOrderPlugin(true),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false
        }
      }),
    ]
  ),

  devtool: false,
}