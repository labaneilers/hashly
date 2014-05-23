"use strict";

var assert = require("chai").assert;
var rewire = require("rewire");

describe("hashcode-generator", function () {

    describe("#generateForFile()", function () {

        it("should return a hashcode and call readFileSync", function () {

            var hashcodeGenerator = rewire("../lib/hashcode-generator");

            var calledReadFileSync = false;

            hashcodeGenerator.__set__("fsutil", {
                readFileSync: function () {
                    calledReadFileSync = true;
                    return "abcdefg";
                }
            });

            assert.equal(hashcodeGenerator.generateForFile("/ignore-this.css"), "7ac66c0f148de9519b8bd264312c4d64");
            assert.isTrue(calledReadFileSync);
        });

        it("should return a hashcode and call statSync and readFileSync for a binary file", function () {

            var hashcodeGenerator = rewire("../lib/hashcode-generator");

            var calledStatSync = false;

            hashcodeGenerator.__set__("fsutil", {
                statSync: function () {
                    calledStatSync = true;
                    return {
                        size: 128
                    };
                }
            });

            assert.equal(hashcodeGenerator.generateForFile("/ignore-this.png", true), "1515b2650a207bf789ab96d2d9f3b90a");
            assert.isTrue(calledStatSync, "Should call statSync()");
        });
    });
});