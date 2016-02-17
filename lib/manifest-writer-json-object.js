"use strict";

exports.name = "json-object";

exports.extension = ".json";

exports.serialize = function(manifestData) {
    var manifestObject = {};
    manifestData.forEach(function(entry) {
                manifestObject[entry.path] = {
                    path: entry.hashedPath,
                    type: entry.type,
                    height: entry.height,
                    width: entry.width
                };
            });
    return JSON.stringify(manifestObject, null, 4);
};

exports.parse = function(serialized) {
    var manifestObject = JSON.parse(serialized);
    var manifestData = [];
    manifestObject.forEach(function(entry, key) {
                manifestData.push({
                            path: key,
                            hashedPath: entry.path,
                            type: entry.type,
                            height: entry.height,
                            width: entry.width
                        });
            });

    return manifestData;
};
