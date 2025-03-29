const path = require("path");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
    const browser = env.browser || 'chromium';
    return {
        entry: {
            background: './src/background/background.js',
            content: './src/content/content.js',
            options: './src/pages/options/index.jsx',
        },
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: "[name].js",
            clean: true,
        },
        resolve: {
            extensions: [".js", ".jsx"],
            alias: {
                '@content': path.resolve(__dirname, 'src/content'),
                '@background': path.resolve(__dirname, 'src/background'),
                '@utils': path.resolve(__dirname, 'src/utils'),
            }
        },
        plugins: [
            new CopyWebpackPlugin({
                patterns: [
                    { from: 'assets/icons', to: "icon" },
                    { from: `platform/${browser}/manifest.json` },
                ],
            }),
            new HtmlWebpackPlugin({
                template: './src/pages/options/options.html',
                filename: 'options.html',
                chunks: ['options'],
                cache: false,
              }),
        ],
        module: {
            rules: [
                {
                    test: /\.(js|jsx)$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                '@babel/preset-env', 
                                ['@babel/preset-react', { 'runtime': 'automatic' }]
                            ]
                        }
                    }
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader']
                },
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
        }
    }
};