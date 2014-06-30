"use strict";

// This is a sample plugin that simply writes the file extension of each file to the manifest

var path = require("path");
var sizeOf = require("image-size");

// Data contains:
// * path
// * pathPhysical
// * hashedPath
// * hashedPathPhysical

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

    try {
        return sizeOf(manifestEntry.pathPhysical);
    } catch (ex) {
        var err =  new Error(ex.message + ": " + manifestEntry.pathPhysical);
        err.innerError = ex;
        throw err;
    }
};