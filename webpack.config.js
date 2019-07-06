const path = require("path");

module.exports = {
    entry: path.join(__dirname, "src/handler.ts"),
    output: {
        libraryTarget: "commonjs",
        filename: "src/handler.js",
        path: path.resolve(__dirname, "dist")
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"]
    }
};
