var front = require('./tools/front.js');
front({
    src: './src',
    name: 'app'
}) //
.dest('./dev') //
.minify() //
.dest('./prod') //
.run();