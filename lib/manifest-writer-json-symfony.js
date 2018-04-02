"use strict";

/**
 * @type {string}
 */
exports.name = "json-symfony";

/**
 * @type {string}
 */
exports.extension = ".json";

/**
 * Format manifest.json for use with symfony asset versioning
 *
 * Example: output
 * {
 *     "/assets/bundle/app.css": "/assets/bundle/app-hc21219d6ba2d498e783661d6fc87cda05.css",
 *    "/assets/bundle/app.js": "/assets/bundle/app-hc56c505dbada50f259e092bc07a43286d.js"
 * }
 *
 * @param manifestData
 * @returns {string}
 */
exports.serialize = function (manifestData) {
    var manifestObject = {};
    manifestData.forEach(function (entry) {
        manifestObject[entry.path] = entry.hashedPath;
    });
    return JSON.stringify(manifestObject, null, 4);
};

/**
 * @param serialized
 * @returns {Array}
 */
exports.parse = function (serialized) {
    var manifestObject = JSON.parse(serialized);
    var manifestData = [];
    manifestObject.forEach(function (entry, key) {
        manifestData.push(key);
    });

    return manifestData;
};
