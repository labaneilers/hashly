"use strict";

exports.name = "json";

exports.extension = ".json";

exports.serialize = function (manifestData) {
	return JSON.stringify(manifestData, null, 4);
};