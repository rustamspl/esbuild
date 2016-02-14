var watcher=require('./watcher');
/*
stream struct:{
    name:'aaa'
    code:some data
}

*/
module.exports = function(opts) {
    var r = {
        _opts:opts,
        _stack: [],
        dest: function(path) {
            r._stack.push(require('./fs').storeTo(path));
            return r;
        },
        minify: function() {
            r._stack.push(require('./js/minify'));
            return r;
        },
        run: function() {
            watcher.watch({
                srs:
            });
        }
    };
    return r;
};