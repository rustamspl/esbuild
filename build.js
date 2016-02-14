var Chokidar = require('chokidar');
var fs = require('fs');
var acorn = require('acorn');
var esrecurse = require('esrecurse');
var astbuilders = require('ast-types').builders;
var escodegen = require('escodegen');
//-------------------------------------
var Path = (function() {
    var org_path = require('path');
    var f = function() {};
    f.prototype = org_path;
    var path = new f();
    'resolve,normalize,relative'.split(',').map(function(k) {
        path[k] = function() {
            return org_path[k].apply(this, arguments).replace(/\\/g, '/').toLowerCase();
        };
    });
    return path;
})();
//-------------------------------------
//-------------------------------------
(function() {
    var glob = {
        currentPath: Path.resolve('.')
        ready: false,
        files: {},
        relativePath: function(p) {
            return Path.relative(glob.currentPath, p);
        }
    };

    function processFiles() {
        if (!glob.ready) return;
        var code = processEntryFile('src/app.js');
        fs.writeFileSync('build/out.js', code);
    }

    function readFile(path) {
        var p = glob.relativePath(path);
        glob.files[p] = fs.readFileSync(p).toString();
        processFiles();
    }
    Chokidar.watch(['./src/**/*.js', './src/**/*.css'], {}) //
    .on('add', readFile) //
    .on('change', readFile) //
    .on('unlink', function(path) {
        delete glob.files[glob.relativePath(path)];
        processFiles();
    }) //
    .on('ready', function() {
        glob.ready = true;
        processFiles();
    });
})();
//-------------------------------------

//-------------------------------------
function processFile(fn) {
    var ast = parseAst(fn);
    return code = escodegen.generate(ast);
}

function processEntryFile(fn) {
    req.addEntryFile(currentPath, fn);
    return req.render();
}

function parseAst(fn) {
    var data = Files[fn];
    var ast = acorn.parse(data);
    fs.writeFileSync(fn + '.json', JSON.stringify(ast));
    esrecurse.visit(ast, {
        CallExpression(node) {
            console.log(node)
            var name = node.callee.name;
            if (name == 'require') {
                var fn2 = node.arguments[0].value;
                node.arguments[0].value = req.addFile(Path.dirname(fn), fn2);
                node.callee.name = '__require__';
            }
            //node.arguments[0].value = 'xxzz';
        }
    });
    return ast;
}
var req = {
    deps: [],
    depsIndex: {},
    addFile: function(base, fn) {
        var m = fn.match(/\.js$/g);
        if (!m) {
            fn += '.js';
        }
        var p = relativePath(Path.resolve(currentPath, base, fn).replace(/\\/g, '/'));
        var id = req.depsIndex[p];
        if (id > 0) {
            return --id;
        }
        console.log(p);
        var code = processFile(p);
        req.deps.push({
            code: code,
            fn: p
        });
        var id = req.deps.length
        req.depsIndex[p] = id;
        return --id;
    },
    addEntryFile: function(base, fn) {
        var id = req.addFile(base, fn);
        req.entryId = id;
        return id;
    },
    render: function() {
        console.log(req.deps);
        return [';var __require__deps=[', req.deps.map(function(d, i) {
            return ['\nfunction(){\n', '/*(' + i + ') => ' + d.fn + ' */\n', d.code, '\n}\n\n'].join('');
        }).join(','), '];function __require__(id){return __require__deps[id];}__require__(' + req.entryId + ')();'].join('');
    }
};
//-------------------------------------