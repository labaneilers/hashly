"use strict";

var assert = require("chai").assert;
var hashpattern = require("../lib/hash-pattern");
var path = require("path");

var fixSeparator = function(str) {
    return str.replace(/\//g, path.sep);
};

describe("hash-pattern", function () {
    describe("#getHashPattern()", function () {

        it("should return a valid pattern with no params (defaults)", function () {
            assert.isObject(hashpattern.getHashPattern());
        });

        it("should return a valid pattern with params", function () {
            assert.isObject(hashpattern.getHashPattern("", 10));
        });

        it("should return a valid pattern with params", function () {
            assert.isObject(hashpattern.getHashPattern("{basename}.{hash}{extname}", 10));
        });

    });

    describe("#isHashedFile()", function () {
        var hash = hashpattern.getHashPattern();

        it("should return true for a full hashed path", function () {
            assert.isTrue(hash.isHashedFile("/foo/bar/baz/blah-hc1234567890abcdef1234567890abcdef.js"));
        });

        it("should return true for a hashed file name", function () {
            assert.isTrue(hash.isHashedFile("blah-hc1234567890abcdef1234567890abcdef.js"));
        });

        it("should return false for a non-hashed file name that is similar to a hashed file name", function () {
            assert.isFalse(hash.isHashedFile("blah-hc-1234567890abcdef1234567890abcdef.js"));
        });

        it("should return false for a full, non-hashed path", function () {
            assert.isFalse(hash.isHashedFile("/foo/bar/baz/blah.js"));
        });

        it("should return false for a full, non-hashed path similar to a hashed file name", function () {
            assert.isFalse(hash.isHashedFile("/foo/bar/baz/blah-hc-1234567890abcdef1234567890abcdef.js"));
        });

        it("should return false for a non-hashed filename", function () {
            assert.isFalse(hash.isHashedFile("blah.js"));
        });

        describe("custom pattern", function () {

            it("should return true for a full hashed path with default length", function () {
                var pattern = hashpattern.getHashPattern("{basename}.{hash}{extname}");
                assert.isTrue(pattern.isHashedFile("/foo/bar/baz/blah.1234567890abcdef1234567890abcdef.js"));
            });

            it("should return true for a hashed file name with short hash", function () {
                var pattern = hashpattern.getHashPattern("{basename}.{hash}{extname}", 10);
                assert.isTrue(pattern.isHashedFile("blah.1234567890abcdef1234567890abcdef.js"));
            });

            it("should return false for a non-hashed file name that is similar to a hashed file name", function () {
                var pattern = hashpattern.getHashPattern("{basename}.{hash}{extname}", 10);
                assert.isFalse(pattern.isHashedFile("blah-hc-1234567890.js"));
            });

            it("should return false for a full, non-hashed path", function () {
                var pattern = hashpattern.getHashPattern("{basename}.{hash}{extname}", 10);
                assert.isFalse(pattern.isHashedFile("/foo/bar/baz/blah.js"));
            });

            it("should return false for a full, non-hashed path similar to a hashed file name", function () {
                var pattern = hashpattern.getHashPattern("{basename}-hash-{hash}{extname}", 10);
                assert.isFalse(pattern.isHashedFile("/foo/bar/baz/blah-hash1234567890abcdef1234567890abcdef.js"));
            });

            it("should return false for a non-hashed filename", function () {
                var pattern = hashpattern.getHashPattern("{basename}.{hash}", 10);
                assert.isFalse(pattern.isHashedFile("blah.js"));
            });

        });

    });

    describe("#getHashedFileName()", function () {
        it("should return a file with the default pattern", function () {
            assert.equal(
                hashpattern.getHashPattern().getHashedFileName("/foo/bar/baz/blah.js", "/foo/bar/baz/dest", "1234567890abcdef1234567890abcdef"),
                fixSeparator("/foo/bar/baz/dest/blah-hc1234567890abcdef1234567890abcdef.js"));
        });

        it("should return a file with a custom pattern", function () {
            assert.equal(
                hashpattern.getHashPattern("{basename}.{hash}{extname}").getHashedFileName("/foo/bar/baz/blah.js", "/foo/bar/baz/dest", "1234567890abcdef1234567890abcdef"),
                fixSeparator("/foo/bar/baz/dest/blah.1234567890abcdef1234567890abcdef.js"));
        });

        it("should return a file with a custom pattern and length", function () {
            assert.equal(
                hashpattern.getHashPattern("{basename}.{hash}{extname}", 10).getHashedFileName("/foo/bar/baz/blah.js", "/foo/bar/baz/dest", "1234567890abcdef1234567890abcdef"),
                fixSeparator("/foo/bar/baz/dest/blah.1234567890.js"));
        });

    });

});