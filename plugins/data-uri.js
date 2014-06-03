"use strict";

// This plugin writes a data URI entry for any images under the specified size.

var MAX_SIZE = 512;

var fs = require("fs");
var path = require("path");
var util = require("util");
var mime = require("mime");

function base64Image(src) {
    var data = fs.readFileSync(src).toString("base64");
    return util.format("data:%s;base64,%s", mime.lookup(src), data);
}

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
    var stat = fs.statSync(manifestEntry.pathPhysical);
    if (stat.size > MAX_SIZE) {
        return {};
    }

    return { "datauri": base64Image(manifestEntry.pathPhysical) };
};