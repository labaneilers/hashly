"use strict";

var assert = require("chai").assert;
var hashpattern = require("../lib/hash-pattern");

describe("hash-pattern", function () {

    describe("#isHashedFile()", function () {

        it("should return true for a full hashed path", function () {
            assert.isTrue(hashpattern.isHashedFile("/foo/bar/baz/blah-hc1234567890abcdef1234567890abcdef.js"));
        });
        
        it("should return true for a hashed file name", function () {
            assert.isTrue(hashpattern.isHashedFile("blah-hc1234567890abcdef1234567890abcdef.js"));
        });
        
        it("should return false for a non-hashed file name that is similar to a hashed file name", function () {
            assert.isFalse(hashpattern.isHashedFile("blah-hc-1234567890abcdef1234567890abcdef.js"));
        });
        
        it("should return false for a full, non-hashed path", function () {
            assert.isFalse(hashpattern.isHashedFile("/foo/bar/baz/blah.js"));
        });
        
        it("should return false for a full, non-hashed path similar to a hashed file name", function () {
            assert.isFalse(hashpattern.isHashedFile("/foo/bar/baz/blah-hc-1234567890abcdef1234567890abcdef.js"));
        });
        
        it("should return false for a non-hashed filename", function () {
            assert.isFalse(hashpattern.isHashedFile("blah.js"));
        });

    });

});