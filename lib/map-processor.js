"use strict";
var JS_SOURCEMAPPINGURL_REGEX = /(^\s*\/\/\#\s*sourceMappingURL=)(.*)$/m;
var CSS_SOURCEMAPPINGURL_REGEX = /(^\s*\/\*\s*\#\s*sourceMappingURL=)(.*)(\s*\*\/)$/m;

exports.processMinFile = function (ext, text, newMapPath, sourcemapURLPrefix) {
	if (ext === ".js") {
    	return text.replace(JS_SOURCEMAPPINGURL_REGEX, "$1"+sourcemapURLPrefix+newMapPath);
	} else if (ext === ".css") {
	    return text.replace(CSS_SOURCEMAPPINGURL_REGEX, "$1"+sourcemapURLPrefix+newMapPath+"$3");
	} else {
		return null;
	}
};
