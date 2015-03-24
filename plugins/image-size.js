    "use strict";


var path = require("path");
var sizeOf = require("image-size");

// File types that should have sizes calculated and included in the manifest json
var _imageTypes = {
    ".jpg": true,
    ".png": true,
    ".gif": true,
    ".bmp": true,
    ".tiff": true,
    ".webp": true
};

exports.processFile = function (manifestEntry) {

    // Get size info for images
    var ext = path.extname(manifestEntry.pathPhysical).toLowerCase();
    if (!_imageTypes[ext]) {
        return {};
    }

    // Optimization: the data already exists in the entry.
    // We're probably in amending mode. Short circuit.
    if (manifestEntry.width && manifestEntry.height) {
        return {};
    }

    return sizeOf(manifestEntry.pathPhysical);
};