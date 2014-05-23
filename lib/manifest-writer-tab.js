"use strict";

exports.name = "tab";

exports.extension = ".tab";

exports.serialize = function (manifestData) {
    if (manifestData.length === 0) {
        return "";
    }

    var header = [];

    var rows = manifestData.map(function (entry) {
        var keys = Object.keys(entry);
        var line = Object.keys(entry).map(function (key) {
            return entry[key];
        });

        if (keys.length > header.length) {
            header = keys;
        }

        return line.join("\t");
    });

    return header.join("\t") + "\n" + rows.join("\n");
};

exports.parse = function (serialized) {
    var lines = serialized.split("\n");
    if (lines.length === 0) {
        return [];
    }

    var parsed = [];
    var keys = lines[0].split("\t");

    for (var i = 1; i < lines.length; i++) {
        var cols = lines[i].split("\t");
        var entry = {};

        for (var j = 0; j < cols.length; j++) {
            // If there are more values than are defined in the header, 
            // just name them by their numeric order.
            var key = j < keys.length ? keys[j] : j.toString();
            entry[key] = cols[j];
        }

        parsed.push[entry];
    }

    return parsed;
};