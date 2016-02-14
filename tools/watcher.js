var Chokidar = require('chokidar');
module.exports.watch = function(opts) {
    var Ready=false;
    Chokidar.watch(opts.src) //
    .on('add', opts.readFile) //
    .on('change', opts.readFile) //
    .on('unlink', function(path) {
        delete Files[relativePath(path)];
        processFiles();
    }) //
    .on('ready', function() {
        Ready = true;
        processFiles();
    });
}