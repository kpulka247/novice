import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import CopyPlugin from "copy-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import ZipPlugin from "zip-webpack-plugin";
import RemoveEmptyScriptsPlugin from "webpack-remove-empty-scripts";

const root = path.dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(path.join(root, "package.json")));
const NAME = "gta6spoilerblocker";

const BROWSER_MANIFEST = {
  chrome: {
    background: { service_worker: "background.js" },
  },
  firefox: {
    background: { scripts: ["background.js"] },
    browser_specific_settings: {
      gecko: {
        id: "gta6-spoiler-blocker@kpulka.com",
        strict_min_version: "140.0",
        data_collection_permissions: { required: ["none"] },
      },
    },
  },
};

function buildManifest(content, browser) {
  const manifest = {
    ...JSON.parse(content),
    version,
    ...BROWSER_MANIFEST[browser],
  };
  if (manifest.description.length > 132) {
    throw new Error("Store descriptions are limited to 132 characters");
  }
  return JSON.stringify(manifest, null, 2);
}

const createConfig = (browser, mode) => {
  const isProduction = mode === "production";
  const distBaseDir = path.resolve(root, "dist");
  const browserOutputDir = path.resolve(distBaseDir, `${NAME}-${browser}`);

  return {
    name: browser,
    mode,
    devtool: isProduction ? false : "cheap-module-source-map",
    entry: {
      content_styles: "./src/styles/content.css",
      popup_styles: "./src/styles/popup.css",
      background: "./src/background.js",
      content: "./src/content/index.js",
      popup: "./src/popup/popup.js",
    },
    output: {
      path: browserOutputDir,
      filename: "[name].js",
      clean: true,
    },
    module: {
      rules: [
        { test: /\.svg$/, type: "asset/source" },
        {
          test: /\.css$/,
          oneOf: [
            { resourceQuery: /raw/, type: "asset/source" },
            { use: [MiniCssExtractPlugin.loader, "css-loader"] },
          ],
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: ({ chunk }) =>
          `styles/${chunk.name.replace("_styles", "")}.css`,
      }),
      new CopyPlugin({
        patterns: [
          {
            from: "public/manifest.json",
            to: "manifest.json",
            transform: (content) => buildManifest(content, browser),
          },
          { from: "public/icons", to: "icons" },
          { from: "src/popup/popup.html", to: "popup.html" },
        ],
      }),
      new RemoveEmptyScriptsPlugin(),
      isProduction &&
        new ZipPlugin({
          path: distBaseDir,
          filename: `${NAME}-${version}-${browser}.zip`,
        }),
    ].filter(Boolean),
    optimization: {
      minimize: isProduction,
      minimizer: ["...", new CssMinimizerPlugin()],
    },
  };
};

export default (_env, argv) => {
  const mode = argv.mode || "development";
  return [createConfig("chrome", mode), createConfig("firefox", mode)];
};
