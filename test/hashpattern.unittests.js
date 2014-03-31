"use strict";

var assert = require("assert");
var hashpattern = require("../lib/hashpattern");

describe("hashpattern", function () {

    describe("#isHashedFile()", function () {

        it("should match a full hashed path", function () {
            assert.ok(hashpattern.isHashedFile("/foo/bar/baz/blah-hc12345.js"));
        });

    });

});