"use strict";

exports.name = "tab";

exports.extension = ".tab";

// Builds a list of headers found in the manifest data.
// We have to loop through the entire set in case
// some of the items have fields the others don't have.
var getHeaders = function (manifestData) {
    var headers = {};

    manifestData.forEach(function (entry) {
        Object.keys(entry).forEach(function (key) {
            if (!headers[key]) {
                headers[key] = true;
            }
        });
    });

    return Object.keys(headers);
};

exports.serialize = function (manifestData) {
    if (manifestData.length === 0) {
        return "";
    }

    var header = getHeaders(manifestData);

    var rows = manifestData.map(function (entry) {
        var line = header.map(function (key) {
            return entry.hasOwnProperty(key) ? entry[key] : "";
        });

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