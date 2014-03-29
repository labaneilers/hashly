var fs = require("fs");
var path = require("path");
var md5 = require('MD5');
var sizeOf = require('image-size');
var args = require("minimist")(process.argv.slice(2), { boolean: ["v", "verbose"]});

var parseArgs = function(args, cwd) {

  if (args._.length === 0) {
    throw new Error("No source directory path specified.");
  }
  if (args._.length === 1) {
    throw new Error("No target directory path specified.");
  }

  return {
    source: path.resolve(cwd, args._[0]),
    target: path.resolve(cwd, args._[1]),
    verbose: args.v || args.verbose || false
  };
};

var _parsedArgs = parseArgs(args, process.cwd());

var recurseDir = function(fullPath, files) {
  if (!files) {
    files = [];
  }

  if (fs.statSync(fullPath).isFile()) {
    files.push(fullPath);
    return files;
  }

  fs.readdirSync(fullPath).forEach(function(file) {
    var childPath = path.join(fullPath, file)
    recurseDir(childPath, files);
  });

  return files;
};

var getHashCode = function(fullPath) {
  return md5(fs.readFileSync(fullPath));
};

var getHashedFileName = function(fullPath, targetDir) {
  var ext = path.extname(fullPath);
  var basename = path.basename(fullPath, ext);
  var hashCode = getHashCode(fullPath);
  return path.join(targetDir, basename + "-hc" + hashCode + ext);
};

var _imageTypes = {
  ".jpg": true,
  ".png": true,
  ".gif": true,
  ".bmp": true,
  ".tiff": true,
  ".webp": true
};

var copySync = function(sourceFile, targetFile) {
  var dir = path.dirname(targetFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  };
  fs.writeFileSync(targetFile, fs.readFileSync(sourceFile));
};

var getRootRelativePath = function(basePath, fullPath) {
  return path.sep + path.relative(basePath, fullPath);
};

var createManifestEntry = function(fullPath, basePath, targetBasePath) {

  var relativePath = path.relative(basePath, fullPath);
  var targetPath = path.resolve(targetBasePath, relativePath);
  var targetDir = path.dirname(targetPath);
  var hashedPathPhysical = getHashedFileName(fullPath, targetDir);
  var hashedPath = path.relative(targetBasePath, hashedPathPhysical);

  var manifestEntry = {
    path: path.sep + relativePath,
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

var createManifestForDirectory = function(sourceDir, targetDir) {
  return recurseDir(sourceDir).map(function(fullPath) { 

    var entry = createManifestEntry(fullPath, sourceDir, targetDir);

    if (_parsedArgs.verbose) {
      console.log(fullPath + " > " + entry.hashedPathPhysical);
    }

    copySync(entry.pathPhysical, entry.hashedPathPhysical);

    return entry;
  });
};

var processDirectory = function(sourceDir, targetDir) {

  if (_parsedArgs.verbose) {
    console.log("Processing directory: " + sourceDir + " > " + targetDir);
    console.log("---------------------");
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

  var trimmedManifest = manifest.map(function(entry) {
    var newEntry = {
      path: entry.path,
      hashedPath: entry.hashedPath
    };

    if (entry.width) {
      newEntry.width = entry.width;
      newEntry.height = entry.height;
    }

    return newEntry;
  });

  if (_parsedArgs.verbose) {
    console.log("Writing manifest: " + manifestPath);
  }

  // Write the manifest
  fs.writeFileSync(manifestPath, JSON.stringify(trimmedManifest, null, 4));

  if (_parsedArgs.verbose) {
    console.log("---------------------");
    console.log("Success");
  }
};

processDirectory(_parsedArgs.source, _parsedArgs.target);
