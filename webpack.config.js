import path from "node:path";
import webpack from "webpack";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import CopyPlugin from "copy-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import ZipPlugin from "zip-webpack-plugin";
import RemoveEmptyScriptsPlugin from "webpack-remove-empty-scripts";
import { MESSAGES } from "./src/locales.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(path.join(root, "package.json")));
const NAME = "novice";

const BROWSER_MANIFEST = {
  chrome: {
    background: { service_worker: "background.js" },
  },
  firefox: {
    background: { scripts: ["background.js"] },
    browser_specific_settings: {
      gecko: {
        id: "novice@kpulka.com",
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
  return JSON.stringify(manifest, null, 2);
}

class LocalesPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap("LocalesPlugin", (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: "LocalesPlugin",
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        () => {
          for (const [locale, messages] of Object.entries(MESSAGES)) {
            const json = Object.fromEntries(
              Object.entries(messages).map(([key, message]) => [
                key,
                { message },
              ]),
            );
            compilation.emitAsset(
              `_locales/${locale}/messages.json`,
              new webpack.sources.RawSource(JSON.stringify(json, null, 2)),
            );
          }
        },
      );
    });
  }
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
      new LocalesPlugin(),
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
