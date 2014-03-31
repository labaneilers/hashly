"use strict";

exports.fileName = "manifest.json";

exports.serialize = function (manifestData) {
	return JSON.stringify(manifestData, null, 4);
};