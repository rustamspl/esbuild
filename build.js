'use strict';
var fs = require('fs');
//var _ = require('lodash');
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
(function() {
    //-------------------------------------
    var IndexedArray=(function(){
        var P=function(){
            var old_push=Array.prototype.push;
            this.push=function(v){    
                var k=this._getField(v);            
                var i=this.length;
                this._index[k]=i;
                this[i]=v;
            };
            this.get=function(k){
                var i=this._index[k];
                if(i>=0){
                    return this[i];
                }
            }
        };
        P.prototype=Array;
        var M=function(getField){
            this._getField=getField;
            this._index={};
        };
        M.prototype=new P();
        return M;
    })();
    var m=new IndexedArray(function(a){
        return a.fn;
    });
    m.push({fn:'aaa'});
    m.push({fn:'bbb'});
    console.log(m.get('bbb'));
    console.log(m);
    //-------------------------------------
    var Watch = (function() {
        var Chokidar = require('chokidar');

        function task(opts, files, queue) {
            var ready = false;

            function processQueue() {
                if (!ready) return;
                queue.reduce(function(p, c) {
                    return c&&c(p);
                }, files);
            }

            function readFile(path) {
                var p = Path.normalize(path);
                files[p] = fs.readFileSync(p).toString();
                processQueue();
            }
            Chokidar.watch(opts.src, {}) //
            .on('add', readFile) //
            .on('change', readFile) //
            .on('unlink', function(path) {
                delete glob.files[Path.normalize(path)];
                processQueue();
            }) //
            .on('ready', function() {
                ready = true;
                processQueue();
            });
        }
        return function(opts) {
            var files = {};
            var queue = [];
            var s = {
                pipe: function(cb) {
                    queue.push(cb);
                    return this;
                }
            };
            process.nextTick(function() {
                task(opts, files, queue);
            });
            return s;
        };
    })();
    //--------------------------------------
    var CompilatorFactory = (function() {
        return function(opts) {};
    })();
    //--------------------------------------
    Watch({
        src: ['./src/**/*.js', './src/**/*.css']
    }) //
    .pipe(CompilatorFactory({
            entry: 'src/app.js'
        }) //
    );
    //-------------------------------------
})();
//-------------------------------------
// (function() {
//     var Chokidar = require('chokidar');
//     var UglifyJS = require("uglify-js");
//     var glob = {
//         currentPath: Path.resolve('.'),
//         files: {},
//         relativePath: function(p) {
//             return Path.relative(glob.currentPath, p);
//         }
//     };
//     var ready = false;
//     function processFiles() {
//         if (!ready) return;
//         var code = processEntryFile(glob, 'src/app.js');
//         fs.writeFileSync('build/out.js', code);
//         // var result = UglifyJS.minify(code, {
//         //     fromString: true,
//         //     mangle: true,
//         //     compress: {
//         //         sequences: true, // join consecutive statemets with the “comma operator”
//         //         properties: true, // optimize property access: a["foo"] → a.foo
//         //         dead_code: true, // discard unreachable code
//         //         drop_debugger: true, // discard “debugger” statements
//         //         unsafe: true, // some unsafe optimizations (see below)
//         //         conditionals: true, // optimize if-s and conditional expressions
//         //         comparisons: true, // optimize comparisons
//         //         evaluate: true, // evaluate constant expressions
//         //         booleans: true, // optimize boolean expressions
//         //         loops: true, // optimize loops
//         //         unused: true, // drop unused variables/functions
//         //         hoist_funs: true, // hoist function declarations
//         //         hoist_vars: true, // hoist variable declarations
//         //         if_return: true, // optimize if-s followed by return/continue
//         //         join_vars: true, // join var declarations
//         //         cascade: true, // try to cascade `right` into `left` in sequences
//         //         //side_effects: true, // drop side-effect-free statements
//         //         warnings: true // warn about potentially dangerous optimizations/code
//         //     }
//         // });
//         // fs.writeFileSync('build/out.min.js', result.code);
//     }
//     function readFile(path) {
//         var p = glob.relativePath(path);
//         glob.files[p] = fs.readFileSync(p).toString();
//         processFiles();
//     }
//     Chokidar.watch(['./src/**/*.js', './src/**/*.css'], {}) //
//     .on('add', readFile) //
//     .on('change', readFile) //
//     .on('unlink', function(path) {
//         delete glob.files[glob.relativePath(path)];
//         processFiles();
//     }) //
//     .on('ready', function() {
//         ready = true;
//         processFiles();
//     });
// })();
//-------------------------------------
//-------------------------------------
var processEntryFile = (function() {
    var acorn = require('acorn');
    var estraverse = require('estraverse');
    var escodegen = require('escodegen');
    //-------------------------------------
    function ast2func(node) {
        if (node.type !== 'FunctionExpression') {
            return null;
        }
        var body = escodegen.generate(node.body);
        var params = node.params.reduce(function(p, c) {
            if (c.type == 'Identifier') {
                p.push(c.name);
            }
            return p;
        }, []).join(',');
        return new Function(params, body);
    };
    //-------------------------------------
    function obj2jsonAst(o) {
        var a = acorn.parse('var r=' + JSON.stringify(o));
        return a.body[0].declarations[0].init;
    }
    //-------------------------------------
    function Req(glob) {
        this.deps = [];
        this.glob = glob;
        this.depsIndex = {};
    };
    Req.prototype = {
        addFile: function(base, fn, fnc) {
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
            // console.log(p);
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
            //console.log(this.deps);
            return [';(function(){\nvar __require__=function(id){return __require__deps[id];};\nvar __require__deps=[', this.deps.map(function(d, i) {
                return ['\nfunction(){\n', //
                    '/*(' + i + ') => ' + d.fn + ' */\n', //
                    'var __return__;\n', //
                    d.code, // 
                    ';return __return__;\n', //
                    '\n}\n\n' //
                ].join('');
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
        nodeRequireFile: function(node, fn, a0, fnc) {
            var req = this;
            var fn2 = a0.value;
            a0.value = req.addFile(Path.dirname(fn), fn2, fnc);
            node.callee.name = '__require__';
        },
        //-------------------------------------
        parseAst: function(fn) {
            var req = this;
            var data = this.glob.files[fn];
            var ast = acorn.parse(data);
            fs.writeFileSync(fn + '.json', JSON.stringify(ast));
            //-------------
            var ret = {
                type: 'Identifier',
                name: '__return__'
            };
            estraverse.replace(ast, {
                enter: function(node, parent) {
                    if (node.type == 'MemberExpression' //
                        && node.object.type == 'Identifier' //
                        && node.object.name == 'module' //
                        && node.property.type == 'Identifier' //
                        && node.property.name == 'exports' //
                    ) {
                        return ret;
                    } else
                    if (node.type == 'CallExpression' //
                        && node.callee.type == 'Identifier' //
                        && node.callee.name == 'require' //
                    ) {
                        if (node.arguments.length >= 1) {
                            var a0 = node.arguments[0];
                            if (a0.type == 'Literal') {
                                var fnc = node.arguments.length >= 2 && ast2func(node.arguments[1]);
                                req.nodeRequireFile(node, fn, a0, fnc);
                            } else {
                                var f = ast2func(a0);
                                if (f) {
                                    return obj2jsonAst(f('nnn'));
                                }
                            }
                        }
                    }
                }
            });
            //--------------------------
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