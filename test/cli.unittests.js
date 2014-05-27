"use strict";

var assert = require("chai").assert;
var rewire = require("rewire");

describe("hashly-cli", function () {

    describe("#processArgs()", function () {

        it("should return clean if --clean passed", function () {
            var cli = rewire("../lib/cli");
            var argv = ["./", "./sourcedir", "--clean"];
            var processArgs = cli.__get__("processArgs");

            var result = processArgs(argv, "/a/b/c");

            assert.isTrue(result.clean);
        });
    });
});