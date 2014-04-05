"use strict";

exports.name = "tab";

exports.extension = ".tab";

exports.serialize = function (manifestData) {
    return manifestData
        .map(function (entry) {

            var line = Object.keys(entry).map(function (key) {
                return entry[key];
            });

            return line.join("\t");
        })
        .join("\n");
};