var md5 = require("md5");
var path = require("path");
var fsutil = require("../lib/file-system-util");

var _binaryTypes = {
    ".pdf": true,
    ".jpg": true,
    ".jpeg": true,
    ".png": true,
    ".gif": true,
    ".bmp": true,
    ".tiff": true,
    ".webp": true,
    ".ico": true
};

exports.generateForFile = function (fullPath, quickhash) {

    if (quickhash) {
        var ext = path.extname(fullPath);
        if (_binaryTypes[ext]) {
            var stats = fsutil.statSync(fullPath);
            return md5(stats.size);
        }
    }


    return md5(fsutil.readFileSync(fullPath));
};

exports.generate = function (text) {
    return md5(text);
};