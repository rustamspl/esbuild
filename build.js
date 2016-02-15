'use strict';
var fs = require('fs');
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
    var Chokidar = require('chokidar');
    var glob = {
        currentPath: Path.resolve('.'),
        files: {},
        relativePath: function(p) {
            return Path.relative(glob.currentPath, p);
        }
    };
    var ready = false;

    function processFiles() {
        if (!ready) return;
        var code = processEntryFile(glob, 'src/app.js');
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
        ready = true;
        processFiles();
    });
})();
//-------------------------------------
var processEntryFile = (function() {
    var acorn = require('acorn');
    var esrecurse = require('esrecurse');
    var estraverse = require('estraverse');
    //var astbuilders = require('ast-types').builders;
    var escodegen = require('escodegen');
    //-------------------------------------
    function Req(glob) {
        this.deps = [];
        this.glob = glob;
        this.depsIndex = {};
    };
    Req.prototype = {
        addFile: function(base, fn) {
            var glob = this.glob;
            var m = fn.match(/\.js$/g);
            if (!m) {
                fn += '.js';
            }
            var p = glob.relativePath(Path.resolve(glob.currentPath, base, fn));
            var id = this.depsIndex[p];
            if (id > 0) {
                return --id;
            }
            console.log(p);
            var code = this.processFile(p);
            this.deps.push({
                code: code,
                fn: p
            });
            var id = this.deps.length
            this.depsIndex[p] = id;
            return --id;
        },
        render: function() {
            console.log(this.deps);
            return [';(function(){\nvar __require__=function(id){return __require__deps[id];};\nvar __require__deps=[', this.deps.map(function(d, i) {
                return ['\nfunction(){\n', '/*(' + i + ') => ' + d.fn + ' */\n', d.code, '\n}\n\n'].join('');
            }).join(','), '];\n__require__(' + this.entryId + ')();})()'].join('');
        },
        addEntryFile: function(base, fn) {
            var id = this.addFile(base, fn);
            this.entryId = id;
            return id;
        },
        processFile: function(fn) {
            var ast = this.parseAst(fn);
            return escodegen.generate(ast);
        },
        //-------------------------------------
        parseAst: function(fn) {
            var req=this;
            var data = this.glob.files[fn];
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
    };
    //-------------------------------------
    //-------------------------------------
    return function(glob, entryFn) {
        var req = new Req(glob);
        req.addEntryFile(glob.currentPath, entryFn);
        return req.render();
    }
})();
//-------------------------------------