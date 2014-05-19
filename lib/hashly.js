"use strict";

var path = require("path");
var md5 = require("MD5");
var minimatch = require("minimatch");
var hashpattern = require("./hash-pattern");
var fsutil = require("./file-system-util");
var serializerFactory = require("./serializer-factory");
var util = require("util");
var cssProcessor = require("./css-processor");

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
var createManifestEntry = function (fullPath, basePath, targetBasePath, data, hashCode) {
    var relativePath = path.relative(basePath, fullPath);
    var targetPath = path.resolve(targetBasePath, relativePath);
    var targetDir = path.dirname(targetPath);
    var hashedPathPhysical = hashpattern.getHashedFileName(fullPath, targetDir, hashCode || getHashCode(fullPath));
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

var createManifestEntryCss = function(fullPath, basePath, targetDir, data) {
    var processImagePath = function(virtualPath) {

        var isRootRelative = virtualPath[0] == "/"
        var imagePhysicalPath = isRootRelative ?
            path.join(basePath, virtualPath) :
            path.resolve(path.dirname(fullPath), virtualPath);

        var imageEntry = processEntry(imagePhysicalPath, basePath, targetDir, data);
        if (!imageEntry) {
            return virtualPath;
        }

        if (!isRootRelative) {
            return path.relative(path.dirname(fullPath), imageEntry.hashedPathPhysical);
        }

        return imageEntry.hashedPath;
    };

    var transformedCssText = cssProcessor.processCss(fsutil.readFileSync(fullPath, "utf8"), processImagePath);

    var entry = createManifestEntry(fullPath, basePath, targetDir, data, md5(transformedCssText));

    entry.transformedText = transformedCssText;

    return entry;
};

var processEntry = function(fullPath, baseDir, targetDir, data) {

    // See if an existing entry exists in the cache
    var existingEntry = data.lookupMap[fullPath];
    if (existingEntry) {
        return existingEntry;
    }

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

    // Apply filters to exclude files if specified
    if (_options.shouldBeExcluded) {
        if (_options.shouldBeExcluded(fullPath)) {
            return;
        }
    }

    var ext = path.extname(fullPath);
    
    // Special case: image paths in CSS files need to be replaced with their hashed versions
    var createManifestEntryMethod = (_options.processCss && ext == ".css") ? createManifestEntryCss : createManifestEntry;
   
    try {
        var entry = createManifestEntryMethod(fullPath, baseDir, targetDir, data);

        if (_options.logger) {
            _options.logger(fullPath + " > " + entry.hashedPathPhysical);
        }

        // Copy the original file to the hashed path
        if (entry.transformedText) {
            fsutil.writeFileSync(entry.hashedPathPhysical, entry.transformedText, "utf8");
            delete entry.transformedText;
        } else {
            fsutil.copySync(entry.pathPhysical, entry.hashedPathPhysical);
        }

        // Populate the manifest
        data.manifest.push(entry);

        // Populate a lookup map of the entries by path, for caching.
        // Because we need to process image paths referenced in CSS files,
        // this prevents us from processing the images twice.
        data.lookupMap[fullPath] = entry;

        return entry;
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
        return null;
    }
};

// Creates an array of manifest entries, and copies the source files
// to their target locations.
var createManifest = function (files, baseDir, targetDir) {

    var data = {
        manifest: [],
        errors: [],
        lookupMap: {}
    };

    files.forEach(function (fullPath) {
        processEntry(fullPath, baseDir, targetDir, data);
    });

    return data;
};

var processFilter = function (filter) {
    if (!filter) {
        return null;
    }
    var filters = filter.split(",").map(function (s) {
        return s.trim();
    });

    return function (filePath) {
        for (var i = 0; i < filters.length; i++) {
            if (minimatch(path.basename(filePath), filters[i])) {
                return true;
            }
        }
        return false;
    };
};

var initOptions = function (options) {
    // Store global options.
    // This is to prevent having to pass around data for cross-cutting concerns (i.e. logging)
    // and polluting all the function signatures
    _options = options || {};

    var includeFilters = processFilter(_options.include);
    var excludeFilters = processFilter(_options.exclude);

    _options.shouldBeExcluded = function (filePath) {
        if (excludeFilters && excludeFilters(filePath)) {
            return true;
        }

        if (includeFilters) {
            return !includeFilters(filePath);
        }

        return false;
    };
};

var handleError = function (ex) {
    if (!ex.wasLogged) {
        if (_options.logError) {
            _options.logError("ERROR: " + ex.message);
        }
    }

    if (_options.logger) {
        _options.logger("---------------------");
        _options.logger("Aborted due to errors. To ignore errors, pass the '--ignore-errors' flag.");
    }

    return -1;
};

// Public API
// Processes the sourceDir, copies the hashed versions of all files to their corresponding
// location in targetDir. Creates a manifest json file that documents all the transformations.
exports.processFiles = function (files, baseDir, targetDir, options) {

    if (!files) {
        throw new Error("No files specified");
    }

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

    // Remove the manifest itself from the list of files to process
    files = files.filter(function (f) {
        return f != manifestPath;
    });

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