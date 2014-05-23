"use strict";

var assert = require("chai").assert;
var cssProcessor = require("../lib/css-processor");
var fs = require("fs");

function readFile(path) {
    var filename = require.resolve(path);
    return fs.readFileSync(filename, "utf8");
}

describe("css-processor", function () {

    describe("#processCss()", function () {

        var minifyCss = function (text) {
            return text.replace(/[\r\n\f]*/, " ");
        };

        var testRoundTrip = function (filename, minify) {
            var cssText = readFile(filename + ".css");

            if (minify) {
                cssText = minifyCss(cssText);
            }

            var processedCss = cssProcessor.processCss(cssText, function (imagePath) {
                return imagePath + "_hashed";
            });

            var expected = readFile(filename + "-processed.css");

            if (minify) {
                expected = minifyCss(expected);
            }

            assert.equal(expected, processedCss);
        };

        it("should transform css paths properly, preserving unix newlines", function () {
            testRoundTrip("./css-with-images-unix");
        });

        it("should transform css paths properly, preserving windows newlines", function () {
            testRoundTrip("./css-with-images-windows");
        });

        it("should transform css paths properly in a minified file", function () {
            testRoundTrip("./css-with-images-unix", true);
        });
    });
});