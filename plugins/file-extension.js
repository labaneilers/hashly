"use strict";

// This is a sample plugin that simply writes the file extension of each file to the manifest

var path = require("path");

// Data contains:
// * path
// * pathPhysical
// * hashedPath
// * hashedPathPhysical

exports.processFile = function (manifestEntry) {
    return {
        ext: path.extname(manifestEntry.path)
    }
};

exports.name = "file-extension";