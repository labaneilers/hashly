"use strict";

var assert = require("chai").assert;
var rewire = require("rewire");
var hashly = rewire("../lib/hashly");

describe("hashly", function () {

    describe("#getHashCode()", function () {

        it("should return a hashcode and call readFileSync", function () {

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

});