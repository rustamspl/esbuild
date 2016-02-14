var UglifyJS = require("uglify-js");
module.exports = function(code) {
    var result = UglifyJS.minify(code, {fromString: true});
    return result.code;
};