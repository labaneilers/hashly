"use strict";

// Supported manifest formats
var _manifestFormats = {
    "json": true,
    "tab": true
};

// Gets the correct serializer for the specified manifest format
exports.getSerializer = function (manifestFormat) {
    manifestFormat = (manifestFormat || "json").toLowerCase();

    if (!_manifestFormats[manifestFormat]) {
        throw new Error("manifestFormat '" + manifestFormat + "' is not known.");
    }
    
    return require("./manifest-writer-" + manifestFormat);
};