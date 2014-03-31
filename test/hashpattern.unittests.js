"use strict";

var assert = require("chai").assert;
var hashpattern = require("../lib/hash-pattern");

describe("hashpattern", function () {

    describe("#isHashedFile()", function () {

        it("should return true for a full hashed path", function () {
            assert.isTrue(hashpattern.isHashedFile("/foo/bar/baz/blah-hc12345.js"));
        });

        it("should return true for a hashed file name", function () {
            assert.isTrue(hashpattern.isHashedFile("blah-hc12345.js"));
        });

        it("should return false for a full, non-hashed path", function () {
            assert.isFalse(hashpattern.isHashedFile("/foo/bar/baz/blah.js"));
        });

        it("should return false for a non-hashed filename", function () {
            assert.isFalse(hashpattern.isHashedFile("blah.js"));
        });

    });

});
