const path = require("path");
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
    const browser = env.browser || 'chromium';
    return {
        entry: {
            background: './src/background/background.js',
            content: './src/content/content.js',
        },
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: "[name].js",
            clean: true,
        },
        resolve: {
            extensions: [".js", ".jsx"],
        },
        plugins: [
            new CopyWebpackPlugin({
                patterns: [{ from: 'assets/icons', to: "icon"}, { from: `platform/${browser}/manifest.json` }, { from: 'src/pages' }],
            }),
        ]
    }
};