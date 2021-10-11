const path = require('path');

module.exports = {
    mode: 'production',
    entry: './dist/transpiled/main.js',
    resolve: {
        modules: [ path.resolve(__dirname, 'external') ]
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js'
    }
};