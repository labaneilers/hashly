"use strict";

var path = require("path");

// Gets the correct hash generator for the specified options
exports.getHashPattern = function (hashFormat, hashLength) {
    hashFormat = hashFormat || "{basename}-hc{hash}{extname}";
    hashLength = hashLength || 32;

    // Generate the regex for testing the hash
    var _hashedFileRegex = new RegExp(hashFormat.replace(/([[^$.|?*+()])/, "\\$1").replace(/{(base|ext)name}/gi, ".*").replace("{hash}", "[a-f0-9]{" + hashLength + "}"), "i");

    return {
        // Determines if a filename is a hashed (generated) path, or an original path
        isHashedFile: function (fileName) {
            return _hashedFileRegex.test(path.basename(fileName));
        },

        // Given a full path and a target directory, will return a hashed filename
        // of a file which corresponds to the original, based in targetDir.
        getHashedFileName: function (fullPath, targetDir, hashCode) {
            var extname = path.extname(fullPath);
            var basename = path.basename(fullPath, extname);

            return path.join(targetDir,
                hashFormat
                    .replace("{basename}", basename)
                    .replace("{hash}", hashCode.substr(0, hashLength))
                    .replace("{extname}", extname));
        }
    };
};