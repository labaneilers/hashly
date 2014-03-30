"use strict";

var fs = require("fs");
var path = require("path");
var md5 = require("MD5");
var sizeOf = require("image-size");
var minimatch = require("minimatch");

// Singleton for global, cross cutting options
var _options;

// File system utils

// Recurses a directory, executing processFile on each entry
var recurseDir = function (fullPath, processFile) {
    if (fs.statSync(fullPath).isFile()) {
        processFile(fullPath);
        return;
    }

    fs.readdirSync(fullPath).forEach(function (file) {
        var childPath = path.join(fullPath, file);
        recurseDir(childPath, processFile);
    });
};

// Copies a file synchronously, creating any necessary directories
var copySync = function (sourceFile, targetFile) {
    var dir = path.dirname(targetFile);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    fs.writeFileSync(targetFile, fs.readFileSync(sourceFile));
};

// Gets an MD5 hash for the specified fullPath
var getHashCode = function (fullPath) {
    return md5(fs.readFileSync(fullPath));
};

// Given a full path and a target directory, will return a hashed filename
// of a file which corresponds to the original, based in targetDir.
var getHashedFileName = function (fullPath, targetDir) {
    var ext = path.extname(fullPath);
    var basename = path.basename(fullPath, ext);
    var hashCode = getHashCode(fullPath);
    return path.join(targetDir, basename + "-hc" + hashCode + ext);
};

// File types that should have sizes calculated and included in the manifest json
var _imageTypes = {
    ".jpg": true,
    ".png": true,
    ".gif": true,
    ".bmp": true,
    ".tiff": true,
    ".webp": true
};

// Calculates the hashcode, target hashed filename, and dimensions (for image file types)
// and returns a structure with this data
var createManifestEntry = function (fullPath, basePath, targetBasePath) {
    var relativePath = path.relative(basePath, fullPath);
    var targetPath = path.resolve(targetBasePath, relativePath);
    var targetDir = path.dirname(targetPath);
    var hashedPathPhysical = getHashedFileName(fullPath, targetDir);
    var hashedPath = path.relative(targetBasePath, hashedPathPhysical);

    var manifestEntry = {
        path: path.sep + relativePath, // Generate root relative (virtual) paths, which is what a webserver will want
        pathPhysical: fullPath,
        hashedPath: path.sep + hashedPath,
        hashedPathPhysical: hashedPathPhysical
    };

    // Get size info for images
    var ext = path.extname(fullPath).toLowerCase();
    if (_imageTypes[ext]) {
        var dimensions = sizeOf(fullPath);
        manifestEntry.width = dimensions.width;
        manifestEntry.height = dimensions.height;
    }

    return manifestEntry;
};

// Creates an array of manifest entries, and copies the source files
// to their target locations.
var createManifestForDirectory = function (sourceDir, targetDir) {

    var manifest = [];
    recurseDir(sourceDir, function (fullPath) {

        // If the file is already hashed, don't re-hash it
        if (isHashedFile(fullPath)) {
            return;
        }

        // Apply filters to exclude files if specified
        if (_options.filterAction) {
            if (_options.filterAction(fullPath)) {
                return;
            }
        }

        var entry = createManifestEntry(fullPath, sourceDir, targetDir);

        if (_options.logger) {
            _options.logger(fullPath + " > " + entry.hashedPathPhysical);
        }

        // Copy the original file to the hashed path
        copySync(entry.pathPhysical, entry.hashedPathPhysical);

        // Populate the manifest
        manifest.push(entry);
    });

    return manifest;
};

// Convert windows separators to URL style
var fixSeparator = function (filePath) {
    var sep = path.sep;
    if (sep == "\\") {
        return filePath.replace(/\\/gi, "/");
    }

    return filePath;
};

var _hashedFileRegex = /.*\-hc[^\.].*/g;

var isHashedFile= function(fileName) {
    return _hashedFileRegex.test(path.basename(fileName));
};

// Public API
// Processes the sourceDir, copies the hashed versions of all files to their corresponding
// location in targetDir. Creates a manifest json file that documents all the transformations,
// and includes the pixel sizes of all images.
exports.processDirectory = function (sourceDir, targetDir, options) {

    // Store global options.
    // This is to prevent having to pass around data for cross-cutting concerns (i.e. logging)
    // and poluting all the function signatures
    _options = options;

    if (_options.filter) {
        _options.filterAction = function (filePath) {
            return minimatch(path.basename(filePath), _options.filter);
        };
    }

    if (_options.logger) {
        _options.logger("---------------------");
        _options.logger("Processing directory: " + sourceDir + " > " + targetDir);

        if (_options.filter) {
            console.log("filter: " + _options.filter);
        }

        _options.logger("---------------------");
    }

    var manifestPath = path.join(targetDir, "manifest.json");

    // Delete the manifest if it exists, so we won't be confused
    // if the manifest is there, but the process failed in the middle.
    if (fs.existsSync(manifestPath)) {
        fs.unlinkSync(manifestPath);
    }

    // Generate the manifest data, which includes hashed file names and sizes,
    // and copies the files
    var manifest = createManifestForDirectory(sourceDir, targetDir);

    // Trim the manifest, eliminating physical file paths,
    // which are irrelevant, since the target directory will likely
    // be deployed to a web server at a different physical path.
    var trimmedManifest = manifest.map(function (entry) {
        var newEntry = {
            path: fixSeparator(entry.path),
            hashedPath: fixSeparator(entry.hashedPath)
        };

        if (entry.width) {
            newEntry.width = entry.width;
            newEntry.height = entry.height;
        }

        return newEntry;
    });

    if (_options.logger) {
        _options.logger("Writing manifest: " + manifestPath);
    }

    // Write the manifest to a file
    fs.writeFileSync(manifestPath, JSON.stringify(trimmedManifest, null, 4));

    if (_options.logger) {
        _options.logger("---------------------");
        _options.logger("Success");
    }
};

exports.clean = function(directory) {
    recurseDir(directory, function(filePath) {
        // console.log(filePath);

        if (isHashedFile(filePath)) {
            // console.log("deleting " + filePath);
            fs.unlinkSync(filePath);
        } else {
            console.log(filePath);
        }
    });
};
