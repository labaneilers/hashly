"use strict";

var path = require("path");
var md5 = require("MD5");
var minimatch = require("minimatch");
var hashpattern = require("./hash-pattern");
var fsutil = require("./file-system-util");
var serializerFactory = require("./serializer-factory");
var util = require("util");

// Singleton for global, cross cutting options
var _options;

// Gets an MD5 hash for the specified fullPath
var getHashCode = function (fullPath) {
    return md5(fsutil.readFileSync(fullPath));
};

var getManifestPath = function (directory, serializer) {
    return path.join(directory, "manifest" + serializer.extension);
};

// var _staticTypes = {
//     ".js": true,
//     ".css": true,
//     ".pdf": true,
//     ".jpg": true,
//     ".png": true,
//     ".gif": true,
//     ".bmp": true,
//     ".tiff": true,
//     ".webp": true
// };

// Calculates the hashcode, target hashed filename, and dimensions (for image file types)
// and returns a structure with this data
var createManifestEntry = function (fullPath, basePath, targetBasePath) {
    var relativePath = path.relative(basePath, fullPath);
    var targetPath = path.resolve(targetBasePath, relativePath);
    var targetDir = path.dirname(targetPath);
    var hashedPathPhysical = hashpattern.getHashedFileName(fullPath, targetDir, getHashCode(fullPath));
    var hashedPath = path.relative(targetBasePath, hashedPathPhysical);

    var manifestEntry = {
        // Generate root relative (virtual) paths, which is what a webserver will want
        path: fsutil.ensureUrlSeparators(path.sep + relativePath),
        pathPhysical: fullPath,
        hashedPath: fsutil.ensureUrlSeparators(path.sep + hashedPath),
        hashedPathPhysical: hashedPathPhysical
    };

    // If plugins are present, give them a change to add data to the manifest entry
    if (_options.plugins) {
        _options.plugins.forEach(function (plugin) {
            var pluginData = plugin.processFile(manifestEntry);
            manifestEntry = util._extend(manifestEntry, pluginData);
        });
    }

    return manifestEntry;
};

// Creates an array of manifest entries, and copies the source files
// to their target locations.
var createManifest = function (files, baseDir, targetDir) {

    var data = {
        manifest: [],
        errors: []
    };

    files.forEach(function (fullPath) {

        // TODO should be case insensitive on windows
        // TODO consider an optimization to skip this if the files were
        // gathered internally.
        if (fullPath.indexOf(baseDir) !== 0) {
            throw new Error("The file '" + fullPath + "' is not in the base directory: '" + baseDir + "'");
        }

        // If the file is already hashed, don't re-hash it
        if (hashpattern.isHashedFile(fullPath)) {
            return;
        }

        // TODO: Move this out so grunt can do the filtering
        // // White-list known static file types
        // var ext = path.extname(fullPath);
        // if (!_staticTypes[ext.toLowerCase()]) {
        //     return;
        // }

        // Apply filters to exclude files if specified
        if (_options.shouldBeExcluded) {
            if (_options.shouldBeExcluded(fullPath)) {
                return;
            }
        }

        try {
            var entry = createManifestEntry(fullPath, baseDir, targetDir);

            if (_options.logger) {
                _options.logger(fullPath + " > " + entry.hashedPathPhysical);
            }

            // Copy the original file to the hashed path
            fsutil.copySync(entry.pathPhysical, entry.hashedPathPhysical);

            // Populate the manifest
            data.manifest.push(entry);
        } catch (ex) {

            if (!_options.continueOnError) {
                throw ex;
            }

            var msg = "ERROR: " + fullPath + ": " + ex.message;

            if (_options.logError) {
                ex.wasLogged = true;
                _options.logError(msg);
            }

            data.errors.push(msg);
        }
    });

    return data;
};

var initOptions = function (options) {
    // Store global options.
    // This is to prevent having to pass around data for cross-cutting concerns (i.e. logging)
    // and polluting all the function signatures
    _options = options || {};

    if (_options.exclude) {
        _options.shouldBeExcluded = function (filePath) {
            return minimatch(path.basename(filePath), _options.filter);
        };
    }
};

var handleError = function (ex) {
    if (!ex.wasLogged) {
        if (_options.logError) {
            _options.logError("ERROR: " + ex.message);
        }
    }

    if (_options.logger) {
        _options.logger("---------------------");
        _options.logger("Aborted due to errors. To ignore errors, pass the '--continue' flag.");
    }

    return -1;
};

// Public API
// Processes the sourceDir, copies the hashed versions of all files to their corresponding
// location in targetDir. Creates a manifest json file that documents all the transformations.
exports.processFiles = function (files, baseDir, targetDir, options) {

    initOptions(options);

    if (!fsutil.existsSync(baseDir)) {
        return handleError(new Error("The source directory '" + baseDir + "' doesn't exist."));
    }

    var serializer = serializerFactory.getSerializer(_options.manifestFormat);

    // Output setup to logger
    if (_options.logger) {
        _options.logger("---------------------");
        _options.logger("Processing directory: " + baseDir + " > " + targetDir);

        if (_options.filter) {
            _options.logger("filter: " + _options.filter);
        }

        _options.logger("manifest format: " + serializer.name);

        _options.logger("---------------------");
    }

    var manifestPath = getManifestPath(targetDir, serializer);

    // Delete the manifest if it exists, so we won't be confused
    // if the manifest is there, but the process failed in the middle.
    fsutil.deleteSync(manifestPath);

    // Generate the manifest data, which includes hashed file names and sizes,
    // and copies the files
    var manifestData;

    try {
        manifestData = createManifest(files, baseDir, targetDir);
    } catch (ex) {
        return handleError(ex);
    }

    // Trim the manifest, eliminating physical file paths,
    // which are irrelevant, since the target directory will likely
    // be deployed to a web server at a different physical path.
    var trimmedManifest = manifestData.manifest.map(function (entry) {

        var newEntry = util._extend(entry);
        delete newEntry.pathPhysical;
        delete newEntry.hashedPathPhysical;

        return newEntry;
    });

    if (_options.logger) {
        _options.logger("Writing manifest: " + manifestPath);
    }

    // Write the manifest to a file
    fsutil.writeFileSync(manifestPath, serializer.serialize(trimmedManifest));

    if (_options.logger) {
        _options.logger("---------------------");

        if (manifestData.errors.length > 0) {
            _options.logger("Errors found: ");
            manifestData.errors.forEach(_options.logger);
        } else {
            _options.logger("Success");
        }
    }

    return manifestData.errors.length > 0 ? -1 : 0;
};

// Public API
// Processes the sourceDir, copies the hashed versions of all files to their corresponding
// location in targetDir. Creates a manifest json file that documents all the transformations.
exports.processDirectory = function (sourceDir, targetDir, options) {

    var files = [];
    fsutil.recurseDirSync(sourceDir, function (file) {
        files.push(file);
    });

    return exports.processFiles(files, sourceDir, targetDir, options);
};

var deleteFileSync = function (filePath) {
    if (_options.logger) {
        _options.logger("Deleting " + filePath + "...");
    }

    fsutil.deleteSync(filePath);
};

exports.clean = function (directory, options) {

    initOptions(options);

    var serializer = serializerFactory.getSerializer(options.manifestFormat);

    if (_options.logger) {
        _options.logger("---------------------");
        _options.logger("Cleaning directory: " + directory);
        _options.logger("---------------------");
    }

    deleteFileSync(getManifestPath(directory, serializer));

    fsutil.recurseDirSync(directory, function (filePath) {

        if (hashpattern.isHashedFile(filePath)) {
            deleteFileSync(filePath);
        }
    });
};