"use strict";

var path = require("path");

var _hashedFileRegex = (/.*\-hc[^\.].*/i);

// Determines if a filename is a hashed (generated) path, or an original path
exports.isHashedFile = function (fileName) {
    return _hashedFileRegex.test(path.basename(fileName));
};

// Given a full path and a target directory, will return a hashed filename
// of a file which corresponds to the original, based in targetDir.
exports.getHashedFileName = function (fullPath, targetDir, hashCode) {
    var ext = path.extname(fullPath);
    var basename = path.basename(fullPath, ext);

    return path.join(targetDir, basename + "-hc" + hashCode + ext);
};
