"use strict";

var path = require("path");
var minimatch = require("minimatch");
var hashpattern = require("./hash-pattern");
var fsutil = require("./file-system-util");
var serializerFactory = require("./serializer-factory");
var util = require("util");
var cssProcessor = require("./css-processor");
var mapProcessor = require("./map-processor");
var hashcodeGenerator = require("./hashcode-generator");

// Singleton for global, cross cutting options
var _options;

var getManifestPath = function(directory, serializer) {

    // If the manifest path is declared explicitly, 
    // use it and ignore the rest of the rules.
    if (_options.manifestPath) {
        return _options.manifestPath;
    }

    return path.join(directory, "manifest" + serializer.extension);
};

var compare = function(a, b) {
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
};

// Calculates the hashcode, target hashed filename, and dimensions (for image file types)
// and returns a structure with this data
var createManifestEntry = function(fullPath, baseDir, targetBaseDir, data, hashCode) {
    var relativePath = path.relative(baseDir, fullPath);
    var targetPath = path.resolve(targetBaseDir, relativePath);
    var targetDir = path.dirname(targetPath);
    var hashCodeCoalesced = hashCode || hashcodeGenerator.generateForFile(fullPath, _options.quickhash);
    var hashedPathPhysical = _options.hashpattern.getHashedFileName(fullPath, targetDir, hashCodeCoalesced);
    var hashedPath = path.relative(targetBaseDir, hashedPathPhysical);

    var manifestEntry = {
        // Generate root relative (virtual) paths, which is what a webserver will want
        path: fsutil.ensureUrlSeparators(path.sep + relativePath),
        pathPhysical: fullPath,
        hashedPath: fsutil.ensureUrlSeparators(path.sep + hashedPath),
        hashedPathPhysical: hashedPathPhysical,
        hashCode: hashCodeCoalesced
    };

    return manifestEntry;
};

var createManifestEntryCss = function(fullPath, baseDir, targetDir, data) {
    var getHashedPath = function(virtualPath) {
        var isRootRelative = virtualPath[0] == "/";
        var physicalPath = isRootRelative ?
            path.join(baseDir, virtualPath) :
            path.resolve(path.dirname(fullPath), virtualPath);

        // do not handle css inlined data
        if (virtualPath.substring(0, 5) === "data:") {
        	return virtualPath;
        }

        var entry = processEntry(physicalPath, baseDir, targetDir, data);
        if (!entry) {
            return virtualPath;
        }

        if (!isRootRelative) {
            // find path of target css file to build correct relative path to hashed resource
            var relativePath = path.relative(baseDir, fullPath);
            var targetPath = path.resolve(targetDir, relativePath);

            return unixifyPath(path.relative(path.dirname(targetPath), entry.hashedPathPhysical));
        }
        return entry.hashedPath;
    };

    var transformedCssText = cssProcessor.processCss(fsutil.readFileSync(fullPath, "utf8"), getHashedPath);

    var entry = createManifestEntry(fullPath, baseDir, targetDir, data, hashcodeGenerator.generate(transformedCssText));

    entry.transformedText = transformedCssText;

    return entry;
};

var createAndAugmentManifestEntry = function(fullPath, baseDir, targetDir, data, hashCode) {
    // Special case: image paths in CSS files need to be replaced with their hashed versions
    var ext = path.extname(fullPath);
    var createManifestEntryMethod = (_options.processCss && ext == ".css") ? createManifestEntryCss : createManifestEntry;
    var entry = createManifestEntryMethod(fullPath, baseDir, targetDir, data, hashCode);

    // If plugins are present, give them a change to add data to the manifest entry
    if (_options.plugins) {
        _options.plugins.forEach(function(plugin) {
            try {
                var pluginData = plugin.processFile(entry);
                entry = util._extend(entry, pluginData);
            } catch (ex) {
                // Plugins in general shouldn't prevent the entry from being created, unless fail-fast
                // option is set.
                var msg = "Plugin " + plugin.name + " encountered an error while processing entry for " + fullPath + ": " + ex.message;
                if (!_options.continueOnPluginError) {
                    var error = new Error(msg);
                    msg.innerError = ex;
                    throw error;
                } else if (_options.logError) {
                    _options.logError("WARNING: " + msg);
                }
            }
        });
    }

    return entry;
};


var isDescendent = function(childPath, baseDir) {
    // Should be case insensitive on windows
    var preprocess = /^win/.test(process.platform) ?
        function(p) {
            return p.toLowerCase();
        } :
        function(p) {
            return p;
        };

    return preprocess(childPath).indexOf(preprocess(baseDir)) === 0;
};

var processEntry = function(fullPath, baseDir, targetDir, data) {
    var ext = path.extname(fullPath);
    // See if an existing entry exists in the cache
    var existingEntry = data.lookupMap[fullPath];
    if (existingEntry && !existingEntry.unverified) {
        return existingEntry;
    }

    // TODO consider an optimization to skip this if the files were
    // gathered internally.
    if (!isDescendent(fullPath, baseDir)) {
        throw new Error("The file '" + fullPath + "' is not in the base directory: '" + baseDir + "'");
    }

    // If the file is already hashed, don't re-hash it
    if (_options.hashpattern.isHashedFile(fullPath)) {
        return;
    }

    // Ignore map files, we check each css and js file for accompaning map file
    if (ext === ".map") {
        return;
    }

    try {
        if (_options.isPassthrough && _options.isPassthrough(fullPath)) {
            // Passthrough means to simply copy file to the destination path, without labeling it with a hashcode or 
            // including in the manifest.
            var relativePath = path.relative(baseDir, fullPath);
            var targetPath = path.join(targetDir, relativePath);
            fsutil.copySync(fullPath, targetPath);
            return null;
        } else {
            // Improve map files to have the hashed filepath in their source (instead of unhashed filepath) - useful for debugging
            // Note: assuming map files are in the same dir as js/css file and they end with .map
            var mapFullPath = fullPath + ".map";
            var mapEntry = null;
                
            var entry = createAndAugmentManifestEntry(fullPath, baseDir, targetDir, data);
                
            if (_options.processMap && fsutil.existsSync(mapFullPath)) {
                mapEntry = createAndAugmentManifestEntry(mapFullPath, baseDir, targetDir, data);
                fsutil.copySync(mapFullPath, mapEntry.hashedPathPhysical);
                if (_options.logger) {
                    _options.logger(mapFullPath + " > " + mapEntry.hashedPathPhysical);
                }
            }

            if (_options.logger) {
                _options.logger(fullPath + " > " + entry.hashedPathPhysical);
            }


            // If the existing entry is already correct, we can skip the rest.
            if (existingEntry && existingEntry.unverified) {
                if (entry.hashedPath === existingEntry.hashedPath) {
                    delete existingEntry.unverified;
                    return existingEntry;
                }
            }

            // Copy the original file to the hashed path
            if (mapEntry) {
            	// if a map hashed path exists, we need to inject it to the source file 

            	// check if text has be transformed
            	var text = entry.transformedText;
            	if (!text) {
            		text = fsutil.readFileSync(fullPath, "utf8");
            	}
            	// Rewrite the source map tag
                var sourcemapFile = _options.sourcemapIncludePath ? mapEntry.hashedPath : path.basename(mapEntry.hashedPath);
                var updatedSourcemapText = mapProcessor.processMinFile(ext, text, sourcemapFile, _options.sourcemapURLPrefix);
                fsutil.writeFileSync(entry.hashedPathPhysical, updatedSourcemapText, "utf8");
                updatedSourcemapText = null;
            } else if (entry.transformedText) {
            	// write transformed text
            	fsutil.writeFileSync(entry.hashedPathPhysical, entry.transformedText, "utf8");
            } else {
            	// copy raw file
                fsutil.copySync(entry.pathPhysical, entry.hashedPathPhysical);
            }

            // Populate the manifest
            data.manifest.push(entry);

            // Populate a lookup map of the entries by path, for caching.
            // Because we need to process image paths referenced in CSS files,
            // this prevents us from processing the images twice.
            data.lookupMap[fullPath] = entry;
            return entry;
        }
    } catch (ex) {

        if (!_options.continueOnError) {
            throw ex;
        }

        var msg = "ERROR: " + fullPath + ": " + ex.message;

        if (_options.logError) {
            ex.wasLogged = true;
            _options.logError(msg);
            _options.logError();
            _options.logError(ex);
        }

        data.errors.push(msg);
        return null;
    }
};

// Creates an array of manifest entries, and copies the source files
// to their target locations.
var createManifest = function(files, baseDir, targetDir, existingManifestData) {

    var data = {
        manifest: [],
        errors: [],
        lookupMap: {}
    };

    // If existing manifest data is passed in, mark the entry as unverified.
    // We will compare the calculated hashed path to the existing hashed path, and know
    // whether it needs to be rewritten, or can be left alone.
    if (existingManifestData) {
        existingManifestData.forEach(function(entry) {
            entry.unverified = true;
            // Populate the lookup map so we can find the entry quickly.
            data.lookupMap[entry.pathPhysical] = entry;
        });
        data.manifest = existingManifestData;
    }

    files.filter(function(fullPath) {
        return (_options.shouldBeExcluded) ? !_options.shouldBeExcluded(fullPath) : true;
    }).map(function(fullPath) {
        processEntry(fullPath, baseDir, targetDir, data);
    });

    return data;
};

var unixifyPath = function(filePath) {
    return filePath.replace(/\\/g, "/");
};

var processFilter = function(filters, baseDir) {
    if (!filters) {
        return null;
    }

    if (typeof filters == "string") {
        filters = [filters];
    }

    return function(filePath) {

        var relativeFilePath = path.relative(baseDir, filePath);

        for (var i = 0; i < filters.length; i++) {
            if (minimatch(unixifyPath(relativeFilePath), unixifyPath(filters[i]))) {
                return true;
            }
        }
        return false;
    };
};

var initOptions = function(options, baseDir, targetDir) {
    // Store global options.
    // This is to prevent having to pass around data for cross-cutting concerns (i.e. logging)
    // and polluting all the function signatures
    _options = options || {};
    _options.sourcemapIncludePath = (typeof options.sourcemapIncludePath === "undefined") ? true : options.sourcemapIncludePath;
    _options.sourcemapURLPrefix = options.sourcemapURLPrefix || "";
    _options.processMap = options.processMap || true;
    // If the passthrough option has been specified, add it to the inclusion filter to make sure 
    // we have a chance to process the file.  This only makes sense if we are writing content 
    // to targetDir that is not the source folder.
    var include = _options.include;
    var passthrough = _options.passthrough;
    var targetIsNotSource = baseDir && targetDir && (baseDir.toLowerCase() !== targetDir.toLowerCase());
    var hasPassthrough = passthrough && targetIsNotSource;
    if (hasPassthrough) {
        if (typeof passthrough == "string") {
            passthrough = [passthrough];
        }
        if (typeof include == "string") {
            include = [include];
        }
        include = include ? include.concat(passthrough) : passthrough;
    }

    var includeFilters = processFilter(include, baseDir);
    var excludeFilters = processFilter(_options.exclude, baseDir);


    _options.shouldBeExcluded = function(filePath) {
        if (excludeFilters && excludeFilters(filePath)) {
            return true;
        }

        if (includeFilters) {
            return !includeFilters(filePath);
        }

        return false;
    };

    if (hasPassthrough) {
        _options.isPassthrough = processFilter(_options.passthrough, baseDir);
    }

    // Initialize the hash generator
    _options.hashpattern = hashpattern.getHashPattern(_options.renameFormat, _options.hashLength);
};

var handleError = function(ex) {
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
exports.processFiles = function(files, baseDir, targetDir, options) {

    if (!files) {
        throw new Error("No files specified");
    }

    initOptions(options, baseDir, targetDir);

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

    var existingManifestData;
    if (_options.amend) {
        if (fsutil.existsSync(manifestPath)) {
            existingManifestData = serializer.parse(fsutil.readFileSync(manifestPath, "utf8"));
            existingManifestData.forEach(function(entry) {
                entry.pathPhysical = baseDir + entry.path;
                entry.hashedPathPhysical = targetDir + entry.hashedPath;
            });
        }
    }

    // Delete the manifest if it exists, so we won't be confused
    // if the manifest is there, but the process failed in the middle.
    fsutil.deleteSync(manifestPath);

    // Remove the manifest itself from the list of files to process
    files = files.filter(function(f) {
        return f != manifestPath;
    });

    // Generate the manifest data, which includes hashed file names and sizes,
    // and copies the files
    var manifestData;

    try {
        manifestData = createManifest(files, baseDir, targetDir, existingManifestData);
    } catch (ex) {
        return handleError(ex);
    }

    // Trim the manifest, eliminating physical file paths,
    // which are irrelevant, since the target directory will likely
    // be deployed to a web server at a different physical path.
    var trimmedManifest = manifestData.manifest.map(function(entry) {

        var newEntry = util._extend(entry);
        delete newEntry.pathPhysical;
        delete newEntry.hashedPathPhysical;
        delete newEntry.unverified;
        delete newEntry.hashCode;

        return newEntry;
    });

    trimmedManifest.sort(function(a, b) {
        return compare(a.path, b.path);
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
exports.processDirectory = function(sourceDir, targetDir, options) {

    var files = [];
    fsutil.recurseDirSync(sourceDir, function(file) {
        files.push(file);
    });

    if (options.baseDir) {
        if (!isDescendent(sourceDir, options.baseDir)) {
            throw new Error("The source directory '" + sourceDir + "' is not in the base directory: '" + options.baseDir + "'");
        }
        // Adjust sourceDir so full paths relative to the base folder will be written to the manifest.
        sourceDir = options.baseDir;
    }

    return exports.processFiles(files, sourceDir, targetDir, options);
};

var deleteFileSync = function(filePath) {
    if (_options.logger) {
        _options.logger("Deleting " + filePath + "...");
    }

    fsutil.deleteSync(filePath);
};

exports.clean = function(directory, options) {

    initOptions(options, directory);

    var serializer = serializerFactory.getSerializer(options.manifestFormat);

    if (_options.logger) {
        _options.logger("---------------------");
        _options.logger("Cleaning directory: " + directory);
        _options.logger("---------------------");
    }

    deleteFileSync(getManifestPath(directory, serializer));

    fsutil.recurseDirSync(directory, function(filePath) {

        if (_options.hashpattern.isHashedFile(filePath)) {
            deleteFileSync(filePath);
        }
    });
};

exports.cleanOld = function(directory, options) {

    initOptions(options, directory);

    var serializer = serializerFactory.getSerializer(options.manifestFormat);

    if (_options.logger) {
        _options.logger("---------------------");
        _options.logger("Cleaning non-manifest files older than " + options.cleanOldDays + " days in directory: " + directory);
        _options.logger("---------------------");
    }

    var manifestPath = getManifestPath(directory, serializer);
    var fileSet = {};
    if (fsutil.existsSync(manifestPath)) {
        var entries = serializer.parse(fsutil.readFileSync(manifestPath, "utf8"));
        entries.forEach(function(entry) {
            fileSet[directory + entry.hashedPath] = true;
        });
    }

    var now = new Date();
    var oldestAllowed = new Date(now.setDate(now.getDate() - (options.cleanOldDays || 0)));

    fsutil.recurseDirSync(directory, function(filePath) {
        if (_options.hashpattern.isHashedFile(filePath)) {
            if (fileSet[filePath]) {
                return;
            }

            if (options.cleanOldDays > 0) {
                var stat = fsutil.statSync(filePath);
                if (stat.mtime >= oldestAllowed) {
                    return;
                }
            }

            deleteFileSync(filePath);
        }
    });
};
