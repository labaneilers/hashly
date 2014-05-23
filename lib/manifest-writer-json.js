"use strict";

exports.name = "json";

exports.extension = ".json";

exports.serialize = function (manifestData) {
	return JSON.stringify(manifestData, null, 4);
};

exports.parse = function (serialized) {
	return JSON.parse(serialized);
};