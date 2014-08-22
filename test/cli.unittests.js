"use strict";

var assert = require("chai").assert;
var rewire = require("rewire");

describe("cli", function () {

    var unixify = function (filePath) {
        return filePath.replace(/^[A-Z]{1}\:/, "").replace(/\\/g, "/");
    };

    describe("#processArgs()", function () {

        var runProcessArgs = function (args, rootPath) {
            var cli = rewire("../lib/cli");
            var argv = ["/nodepath/node", "/hashlypath/hashly"].concat(args);
            var processArgs = cli.__get__("processArgs");

            return processArgs(argv, rootPath || "/a/b/c");
        };

        it("should return clean args if --clean passed", function () {
            var result = runProcessArgs(["./sourcedir", "--clean"]);

            assert.isTrue(result.clean);
            assert.equal(unixify(result.sourceDir), "/a/b/c/sourcedir");
            assert.equal(unixify(result.targetDir), "/a/b/c/sourcedir");
        });

        it("should return targetDir if passed 2 path args", function () {
            var result = runProcessArgs(["./sourcedir", "./targetdir"]);

            assert.isFalse(result.clean);
            assert.equal(unixify(result.sourceDir), "/a/b/c/sourcedir");
            assert.equal(unixify(result.targetDir), "/a/b/c/targetdir");
        });

        it("should return exclude/include args", function () {
            var result = runProcessArgs(["./sourcedir", "--include=*.png,*.jpg", "--exclude=*.xml,*.config"]);

            assert.isFalse(result.clean);
            assert.equal(result.options.include, "*.png,*.jpg");
            assert.equal(result.options.exclude, "*.xml,*.config");
            assert.equal(unixify(result.sourceDir), "/a/b/c/sourcedir");
            assert.equal(unixify(result.targetDir), "/a/b/c/sourcedir");
        });

        it("should return exclude/include args", function () {
            var result = runProcessArgs(["./sourcedir", "--plugins=./pluginsdir"]);

            assert.isFalse(result.clean);
            assert.equal(result.plugins, "./pluginsdir");
            assert.equal(unixify(result.sourceDir), "/a/b/c/sourcedir");
            assert.equal(unixify(result.targetDir), "/a/b/c/sourcedir");
        });

        it("should return baseDir args --base-dir passed", function () {
            var result = runProcessArgs(["/a/b/c", "--base-dir=/a"]);
            assert.equal(result.options.baseDir, "/a");
        });
    });
});