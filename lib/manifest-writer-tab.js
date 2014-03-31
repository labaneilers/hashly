"use strict";

exports.fileName = "manifest.tab";

exports.serialize = function (manifestData) {
	return manifestData
		.map(function (entry) {
			var line = entry.path + "\t" + entry.hashedPath;

			if (entry.width) {
				line += "\t" + entry.width + "\t" + entry.height;
			}

			return line;
		})
		.join("\n");
};