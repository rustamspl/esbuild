var path=require('path');
path.norm=function(a){
    return path.normalize(a).replace(/\\/g,'/');
};
console.log(path.norm(path.resolve('.')+'/qwe/asd'));