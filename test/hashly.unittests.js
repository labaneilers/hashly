"use strict";

var assert = require("chai").assert;
var rewire = require("rewire");
var util = require("util");

var getMockPath = function (sep) {
    var path = require("path");
    return util._extend({}, path, {
        sep: sep
    });
};

describe("hashly", function () {

    describe("#getHashCode()", function () {

        it("should return a hashcode and call readFileSync", function () {

            var hashly = rewire("../lib/hashly");

            var called = false;

            hashly.__set__("fsutil", {
                readFileSync: function () {
                    called = true;
                    return "abcdefg";
                }
            });

            var method = hashly.__get__("getHashCode");

            assert.equal(method("/ignore-this.css"), "7ac66c0f148de9519b8bd264312c4d64");
            assert.isTrue(called);
        });
    });

    describe("#createManifestEntry()", function () {

        var getCreateManifestEntry = function (sep, hashedFileName) {
            var hashly = rewire("../lib/hashly");

            hashly.__set__("hashpattern", {
                getHashedFileName: function () {
                    return hashedFileName;
                }
            });

            hashly.__set__("getHashCode", function () {
                return "";
            });

            hashly.__set__("path", getMockPath(sep));

            hashly.__set__("_options", {});

            return hashly.__get__("createManifestEntry");
        };

        it("should properly resolve virtual and physical paths in source and target directories on unix", function () {
            var method = getCreateManifestEntry("/", "/alt/b/c/file-hc12345.png");
            var entry = method("/a/b/c/file.png", "/a/b", "/alt/b");

            assert.equal(entry.pathPhysical, "/a/b/c/file.png");
            assert.equal(entry.path, "/c/file.png");
            assert.equal(entry.hashedPath, "/c/file-hc12345.png");
            assert.equal(entry.hashedPathPhysical, "/alt/b/c/file-hc12345.png");
        });

        it("should properly resolve virtual and physical paths in source and target directories on windows", function () {
            var method = getCreateManifestEntry("\\", "C:\\alt\\b\\c\\file-hc12345.png");
            var entry = method("C:\\a\\b\\c\\file.png", "C:\\a\\b", "C:\\alt\\b");

            assert.equal(entry.pathPhysical, "C:\\a\\b\\c\\file.png");
            assert.equal(entry.path, "/c/file.png");
            assert.equal(entry.hashedPath, "/c/file-hc12345.png");
            assert.equal(entry.hashedPathPhysical, "C:\\alt\\b\\c\\file-hc12345.png");
        });

        it("should generate matching pathPhysical and hashedPathPhysical when source and target are the same on unix", function () {
            var method = getCreateManifestEntry("/", "/a/b/c/file-hc12345.png");
            var entry = method("/a/b/c/file.png", "/a/b", "/a/b");

            assert.equal(entry.pathPhysical, "/a/b/c/file.png");
            assert.equal(entry.path, "/c/file.png");
            assert.equal(entry.hashedPath, "/c/file-hc12345.png");
            assert.equal(entry.hashedPathPhysical, "/a/b/c/file-hc12345.png");
        });

        it("should generate matching pathPhysical and hashedPathPhysical when source and target are the same on windows", function () {
            var method = getCreateManifestEntry("\\", "C:\\a\\b\\c\\file-hc12345.png");
            var entry = method("C:\\a\\b\\c\\file.png", "C:\\a\\b", "C:\\a\\b");

            assert.equal(entry.pathPhysical, "C:\\a\\b\\c\\file.png");
            assert.equal(entry.path, "/c/file.png");
            assert.equal(entry.hashedPath, "/c/file-hc12345.png");
            assert.equal(entry.hashedPathPhysical, "C:\\a\\b\\c\\file-hc12345.png");
        });
    });

});