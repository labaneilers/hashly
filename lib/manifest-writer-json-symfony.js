"use strict";

exports.name = "json-symfony";

exports.extension = ".json";

exports.serialize = function(manifestData) {
    var manifestObject = {};
    manifestData.forEach(function(entry) {
                manifestObject[entry.path] = entry.hashedPath;
            });
    return JSON.stringify(manifestObject, null, 4);
};

exports.parse = function(serialized) {
    var manifestObject = JSON.parse(serialized);
    var manifestData = [];
    manifestObject.forEach(function(entry, key) {
                manifestData.push(key);
            });

    return manifestData;
};
