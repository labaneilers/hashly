"use strict";

var assert = require("chai").assert;
var rewire = require("rewire");

describe("cli", function () {

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
            assert.equal(result.sourceDir, "/a/b/c/sourcedir");
            assert.equal(result.targetDir, "/a/b/c/sourcedir");
        });

        it("should return targetDir if passed 2 path args", function () {
            var result = runProcessArgs(["./sourcedir", "./targetdir"]);

            assert.isFalse(result.clean);
            assert.equal(result.sourceDir, "/a/b/c/sourcedir");
            assert.equal(result.targetDir, "/a/b/c/targetdir");
        });

        it("should return exclude/include args", function () {
            var result = runProcessArgs(["./sourcedir", "--include=*.png,*.jpg", "--exclude=*.xml,*.config"]);

            assert.isFalse(result.clean);
            assert.equal(result.options.include, "*.png,*.jpg");
            assert.equal(result.options.exclude, "*.xml,*.config");
            assert.equal(result.sourceDir, "/a/b/c/sourcedir");
            assert.equal(result.targetDir, "/a/b/c/sourcedir");
        });

        it("should return exclude/include args", function () {
            var result = runProcessArgs(["./sourcedir", "--plugins=./pluginsdir"]);

            assert.isFalse(result.clean);
            assert.equal(result.plugins, "./pluginsdir");
            assert.equal(result.sourceDir, "/a/b/c/sourcedir");
            assert.equal(result.targetDir, "/a/b/c/sourcedir");
        });
    });
});