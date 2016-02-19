"use strict";

exports.processCss = function (cssText, processVirtualPath) {
    var urlRegex = /url\(([^\)]*?)\)/gi;

    return cssText.replace(urlRegex, function (match, capture) {
        var url = capture;
        var quote = "";
        var appendix = "";
        if (url[0] === "\"" || url[0] === "'") {
            quote = url[0];
            url = url.substring(1, url.length - 1);
        }
        if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0 || url.indexOf("//") === 0) {
            return match;
        }
        
        // check for anchor or query params (which are not a real path)
        var splitIndex = url.search(/[#?]/);
        if (splitIndex >= 0) {
        	appendix = url.substring(splitIndex);
        	url = url.substring(0, splitIndex);
        }

        return "url(" + quote + processVirtualPath(url) + appendix + quote + ")";
    });
};