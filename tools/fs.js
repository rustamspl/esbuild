var fs=require('fs');

module.exports.storeTo = function(path){
    return function(stream){
        fs.writeFileSync(path+'/'+stream.name+'.js',stream.code);
    }
};