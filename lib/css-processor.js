"use strict";

exports.processCss = function (cssText, processVirtualPath) {
    var urlRegex = /url\(([^\)]*?)\)/gi;

    return cssText.replace(urlRegex, function (match, capture) {
        var url = capture;
        var quote = "";
        if (url[0] === "\"" || url[0] === "'") {
            quote = url[0];
            url = url.substring(1, url.length - 1);
        }
        if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0 || url.indexOf("//") === 0) {
            return match;
        }

        return "url(" + quote + processVirtualPath(url) + quote + ")";
    });
};