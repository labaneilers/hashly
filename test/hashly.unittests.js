"use strict";

var assert = require("chai").assert;
var rewire = require("rewire");
var util = require("util");

var getMockPath = function(sep) {
    var path = require("path");
    return util._extend({}, path, {
        sep: sep
    });
};

describe("hashly", function() {

    describe("#createManifestEntry()", function() {

        var getCreateManifestEntry = function(sep, hashedFileName, options) {
            var hashly = rewire("../lib/hashly");

            hashly.__set__("hashcodeGenerator", {
                generateForFile: function() {
                    return "";
                }
            });

            hashly.__set__("path", getMockPath(sep));

            var opts = util._extend(options || {}, {
                hashpattern: {
                    getHashedFileName: function() {
                        return hashedFileName;
                    }
                }
            });

            hashly.__set__("_options", opts);

            return hashly.__get__("createAndAugmentManifestEntry");
        };

        it("should properly resolve virtual and physical paths in source and target directories on unix", function() {
            var method = getCreateManifestEntry("/", "/alt/b/c/file-hc12345.png");
            var entry = method("/a/b/c/file.png", "/a/b", "/alt/b");

            assert.equal(entry.pathPhysical, "/a/b/c/file.png");
            assert.equal(entry.path, "/c/file.png");
            assert.equal(entry.hashedPath, "/c/file-hc12345.png");
            assert.equal(entry.hashedPathPhysical, "/alt/b/c/file-hc12345.png");
        });

        // it("should properly resolve virtual and physical paths in source and target directories on windows", function () {
        //     var method = getCreateManifestEntry("\\", "C:\\alt\\b\\c\\file-hc12345.png");
        //     var entry = method("C:\\a\\b\\c\\file.png", "C:\\a\\b", "C:\\alt\\b");

        //     assert.equal(entry.pathPhysical, "C:\\a\\b\\c\\file.png");
        //     assert.equal(entry.path, "/c/file.png");
        //     assert.equal(entry.hashedPath, "/c/file-hc12345.png");
        //     assert.equal(entry.hashedPathPhysical, "C:\\alt\\b\\c\\file-hc12345.png");
        // });

        it("should generate matching pathPhysical and hashedPathPhysical when source and target are the same on unix", function() {
            var method = getCreateManifestEntry("/", "/a/b/c/file-hc12345.png");
            var entry = method("/a/b/c/file.png", "/a/b", "/a/b");

            assert.equal(entry.pathPhysical, "/a/b/c/file.png");
            assert.equal(entry.path, "/c/file.png");
            assert.equal(entry.hashedPath, "/c/file-hc12345.png");
            assert.equal(entry.hashedPathPhysical, "/a/b/c/file-hc12345.png");
        });

        // it("should generate matching pathPhysical and hashedPathPhysical when source and target are the same on windows", function () {
        //     var method = getCreateManifestEntry("\\", "C:\\a\\b\\c\\file-hc12345.png");
        //     var entry = method("C:\\a\\b\\c\\file.png", "C:\\a\\b", "C:\\a\\b");

        //     assert.equal(entry.pathPhysical, "C:\\a\\b\\c\\file.png");
        //     assert.equal(entry.path, "/c/file.png");
        //     assert.equal(entry.hashedPath, "/c/file-hc12345.png");
        //     assert.equal(entry.hashedPathPhysical, "C:\\a\\b\\c\\file-hc12345.png");
        // });

        it("should call specified plugins and append their output to the manifestEntry", function() {

            var mockPlugin = {
                processFile: function(entry) {
                    return {
                        pluginFileName: "plugin:" + entry.path
                    };
                }
            };

            var method = getCreateManifestEntry("/", "/alt/b/c/file-hc12345.png", {
                plugins: [
                    mockPlugin
                ]
            });

            var entry = method("/a/b/c/file.png", "/a/b", "/alt/b");

            assert.equal(entry.pluginFileName, "plugin:/c/file.png");
        });

        it("should swallow plugin error if --ignore-plugin-error is true", function() {

            var pluginCalled = true;
            var mockPlugin = {
                processFile: function() {
                    pluginCalled = true;
                    throw new Error("Oops");
                }
            };

            var method = getCreateManifestEntry("/", "/alt/b/c/file-hc12345.png", {
                plugins: [
                    mockPlugin
                ],
                continueOnPluginError: true
            });

            var entry = method("/a/b/c/file.png", "/a/b", "/alt/b");
            assert.equal(entry.pathPhysical, "/a/b/c/file.png");
            assert.equal(pluginCalled, true);
        });
    });

    describe("#createManifest()", function() {

        it("should call copySync and return a manifest", function() {
            var hashly = rewire("../lib/hashly");

            hashly.__set__("fsutil", {
                recurseDirSync: function(sourceDir, processFile) {
                    assert.equal(sourceDir, "/a/b");

                    processFile("/a/b/c/file.png");
                },
                copySync: function(source, target) {
                    assert.equal(source, "/a/b/c/file.png");
                    assert.equal(target, "/alt/b/c/b/file-hc12345.png");
                },
                existsSync: function() {
                    return false;
                }
            });

            hashly.__set__("createManifestEntry", function(fullPath /*, sourceDir, targetDir */ ) {
                assert.equal(fullPath, "/a/b/c/file.png");

                return {
                    path: "/c/b/file.png",
                    pathPhysical: "/a/b/c/file.png",
                    hashedPath: "/c/b/file-hc12345.png",
                    hashedPathPhysical: "/alt/b/c/b/file-hc12345.png",
                };
            });

            hashly.__set__("_options", {
                hashpattern: {
                    isHashedFile: function() {
                        return false;
                    }
                }
            });

            var createManifest = hashly.__get__("createManifest");

            var data = createManifest(["/a/b/c/file.png"], "/a/b", "/alt/b");

            assert.equal(data.manifest.length, 1);
            assert.equal(data.manifest[0].path, "/c/b/file.png");

        });

        it("should return an empty manifest if filters are applied", function() {
            var hashly = rewire("../lib/hashly");

            hashly.__set__("fsutil", {
                recurseDirSync: function(sourceDir, processFile) {
                    assert.equal(sourceDir, "/a/b");

                    processFile("/a/b/c/file.png");
                }
            });

            hashly.__set__("_options", {
                shouldBeExcluded: function( /* fullPath */ ) {
                    return true;
                }
            });

            var createManifest = hashly.__get__("createManifest");

            var data = createManifest(["/a/b/c/file.png"], "/a/b", "/alt/b");

            assert.equal(data.manifest.length, 0);
        });
    });

    describe("#processFiles()", function() {

        var getHashly = function() {
            var hashly = rewire("../lib/hashly");

            hashly.__set__("serializerFactory", {
                getSerializer: function(manifestFormat) {
                    assert.equal(manifestFormat, "json");
                    return {
                        serialize: function(trimmedManifest) {
                            assert.isArray(trimmedManifest);
                            assert.equal(trimmedManifest.length, 1);
                            assert.equal(trimmedManifest[0].path, "/c/foo.png");
                            return "abcdefg";
                        }
                    };
                }
            });

            hashly.__set__("fsutil", {
                recurseDirSync: function(directory, processFile) {
                    assert.equal(directory, "/a/b");
                    processFile("/a/b/c/file.png");
                },
                existsSync: function(file) {
                    assert.equal(file, "/a/b");
                    return true;
                },
                deleteSync: function(file) {
                    assert.equal(file, "/alt/b/manifest.json");
                },
                writeFileSync: function(file, data) {
                    assert.equal(file, "/alt/b/manifest.json");
                    assert.equal(data, "abcdefg");
                }
            });

            hashly.__set__("getManifestPath", function(targetDir, serializer) {
                assert.equal(targetDir, "/alt/b");
                assert.property(serializer, "serialize");

                return "/alt/b/manifest.json";
            });

            hashly.__set__("createManifest", function(files, sourceDir, targetDir) {
                assert.equal(sourceDir, "/a/b");
                assert.equal(targetDir, "/alt/b");

                return {
                    manifest: [{
                        path: "/c/foo.png",
                        pathPhysical: "/a/b/c/foo.png",
                        hashedPath: "/c/foo-hc-12345.png",
                        hashedPathPhysical: "/a/b/c/foo-hc12345.png",
                    }],
                    errors: []
                };
            });

            return hashly;
        };

        it("should call writeFileSync with manifest data", function() {

            var options = {
                manifestFormat: "json"
            };

            var exitCode = getHashly().processFiles(["/a/b/c/file.png"], "/a/b", "/alt/b", options);

            assert.equal(exitCode, 0);
        });

        it("should check for sourcemap file and modify the js file with the hashed map file name", function() {
            var hashly = rewire("../lib/hashly");
            var _fsutil = rewire("../lib/file-system-util");
            var options = {
                manifestFormat: "json",
                sourcemapURLPrefix: "https://s3-us-west-2.amazonaws.com/vistacore-testing-bucket/dir"
            };
            _fsutil.writeFileSync = function(file, data) {
                if(file.indexOf("test\\fixtures\\aggregated_min-hc") > -1){
                    assert.isTrue(data.match("https://s3-us-west-2.amazonaws.com/vistacore-testing-bucket/dir/test/fixtures/aggregated_min.js-") !== null );
                }
            };
            hashly.__set__("fsutil", _fsutil);
            var exitCode = hashly.processFiles(["./test/fixtures/aggregated_min.js"], ".", "./alt/b", options);
            assert.equal(exitCode, 0);
            _fsutil.writeFileSync = function(file, data) {
                if(file.match("aggregated_min-hc") !== null){
                    assert.isTrue(data.match("https://s3-us-west-2.amazonaws.com/vistacore-testing-bucket/dir/aggregated_min.js-") !== null );
                }
            };
            exitCode = hashly.processFiles(["./test/fixtures/aggregated_min.js"], "./test/fixtures/", "./alt/b", options);
            assert.equal(exitCode, 0);

        });
        it("should return -1 and log an error if createManifest throws an exception", function() {

            var logErrorCalled = false;

            var options = {
                manifestFormat: "json",
                logError: function(msg) {
                    assert.isTrue(msg.indexOf("Something bad happened") >= 0);
                    logErrorCalled = true;
                }
            };

            var hashly = getHashly();
            hashly.__set__("createManifest", function() {
                throw new Error("Something bad happened");
            });

            var exitCode = hashly.processFiles(["/a/b/c/file.png"], "/a/b", "/alt/b", options);

            assert.equal(exitCode, -1);
            assert.isTrue(logErrorCalled);
        });

        it("should return -1 and log an error if the source directory doesn't exist", function() {
            var hashly = rewire("../lib/hashly");

            hashly.__set__("fsutil", {
                existsSync: function(file) {
                    assert.equal(file, "/a/b");
                    return false;
                }
            });

            var logErrorCalled = false;

            var options = {
                logError: function(msg) {
                    assert.isTrue(msg.indexOf("/a/b") >= 0);
                    logErrorCalled = true;
                }
            };

            var exitCode = hashly.processFiles(["/a/b/c/file.png"], "/a/b", "/alt/b", options);

            assert.equal(exitCode, -1);
            assert.isTrue(logErrorCalled);
        });

        it("should copy passthrough files without renaming", function() {

            var unixify = function(filePath) {
                return filePath.replace(/^[A-Z]{1}\:/, "").replace(/\\/g, "/");
            };

            var hashly = rewire("../lib/hashly");

            var copied = false;
            hashly.__set__("fsutil", {
                existsSync: function() {
                    return true;
                },
                deleteSync: function() {},
                writeFileSync: function() {},
                copySync: function(source, dest) {
                    assert.equal(unixify(source), "/a/b/c/file.png");
                    assert.equal(unixify(dest), "/x/y/c/file.png");
                    copied = true;
                }
            });

            var options = {
                passthrough: "**/*.png"
            };

            hashly.processFiles(["/a/b/c/file.png"], "/a/b", "/x/y", options);
            assert.isTrue(copied);
        });
    });

    describe("#processDirectory()", function() {

        var getHashly = function(expectedDir) {
            var hashcodeGenerator = rewire("../lib/hashcode-generator");
            var hashly = rewire("../lib/hashly");

            hashcodeGenerator.__set__("fsutil", {
                readFileSync: function() {
                    return "abcdefg";
                }
            });

            hashly.__set__("hashcodeGenerator", hashcodeGenerator);

            var fsutil = hashly.__get__("fsutil");
            hashly.__set__("fsutil", {
                recurseDirSync: function(directory, processFile) {
                    assert.equal(directory, expectedDir);
                    processFile(expectedDir + "/file1.png");
                },
                existsSync: function(file) {
                    return (file.match(/\.map?/)) ? false : true;
                },
                deleteSync: function() {},
                writeFileSync: function(file) {
                    assert.equal(file, "/out/manifest.json");
                },
                copySync: function() {},
                ensureUrlSeparators: function(path) {
                    return fsutil.ensureUrlSeparators(path);
                }
            });

            hashly.__set__("getManifestPath", function(targetDir) {
                assert.equal(targetDir, "/out");
                return "/out/manifest.json";
            });

            var createManifest = hashly.__get__("createManifest");
            hashly.__set__("createManifest", function(files, baseDir, targetDir, existingManifestData) {
                assert.equal(baseDir, "/a");
                assert.equal(targetDir, "/out");
                var result = createManifest(files, baseDir, targetDir, existingManifestData);
                assert.equal(result.manifest.length, 1);
                // Path is relative to baseDir from options.
                assert.equal(result.manifest[0].path, "/b/c/file1.png");
                assert.equal(result.manifest[0].pathPhysical, "/a/b/c/file1.png");
                assert.equal(result.manifest[0].hashedPath.indexOf("/b/c/file1"), 0);
                return result;
            });

            return hashly;
        };

        it("should generate manifest paths relative to base-dir.", function() {

            var options = {
                baseDir: "/a",
                manifestFormat: "json",
            };

            var dir = "/a/b/c";
            var exitCode = getHashly(dir).processDirectory(dir, "/out", options);

            assert.equal(exitCode, 0);
        });
    });

});