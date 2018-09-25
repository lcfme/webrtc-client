const fs = require('fs');
const path = require('path');
const browserify = require('browserify');
const chalk = require('chalk');

const log = console.log.bind(console);

let babelConfig;
try {
    babelConfig = JSON.parse(
        fs.readFileSync(__dirname + '/.babelrc').toString()
    );
} catch (err) {
    babelConfig = {};
}

const b = browserify({
    standalone: 'WebRTC'
});
b.transform('babelify', babelConfig);
b.require('./src/client.js');
b.bundle((err, buf) => {
    if (err) {
        log(chalk.red(err));
        process.exit(1);
    }
    fs.writeFileSync(__dirname + '/client.js', buf);
});
