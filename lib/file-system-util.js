"use strict";

var fs = require("fs");
var path = require("path");

// Recurses a directory, executing processFile on each entry
var recurseDirSync = function (fullPath, processFile) {
    if (fs.statSync(fullPath).isFile()) {
        processFile(fullPath);
        return;
    }

    fs.readdirSync(fullPath).forEach(function (file) {
        var childPath = path.join(fullPath, file);
        recurseDirSync(childPath, processFile);
    });
};

var ensureDirectory = function (filePath) {
    var dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
};

exports.recurseDirSync = recurseDirSync;

// Copies a file synchronously, creating any necessary directories
exports.copySync = function (sourceFile, targetFile) {
    var dir = path.dirname(targetFile);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    fs.writeFileSync(targetFile, fs.readFileSync(sourceFile));
};

// Convert windows separators to URL style
exports.ensureUrlSeparators = function (filePath) {
    var sep = path.sep;
    if (sep == "\\") {
        return filePath.replace(/\\/gi, "/");
    }

    return filePath;
};

exports.readFileSync = fs.readFileSync;

exports.writeFileSync = function (filePath, text, encoding) {
    ensureDirectory(filePath);
    fs.writeFileSync(filePath, text, encoding);
};

exports.deleteSync = function (filePath, throwIfNotExists) {
    if (throwIfNotExists || fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

exports.existsSync = fs.existsSync;

exports.statSync = fs.statSync;