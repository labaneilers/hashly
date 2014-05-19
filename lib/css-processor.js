// var fs = require("fs");
// var path = require("path");

exports.processCss = function(cssText, getHashedVirtualPath) {
	var urlRegex = /url\(([^\)]*?)\)/gi;

	var lines = cssText.split("\n");
	var output = [];

	lines.forEach(function(line) {
		var match = urlRegex.exec(line);
		if (match && match.length >= 2) {
			var urlStart = line.indexOf("(", match.index) + 1;
			var urlEnd = line.indexOf(")", match.index);
			var start = line.substring(0, urlStart);
			var end = line.substring(urlEnd);

			var url = match[1];
			url = url.replace(/[\s"\']/g, "");

			if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0 || url.indexOf("//") === 0) {
				// absolute path: ignore and continue
				output.push(line);
				return;
			} 

			var hashedUrl = getHashedVirtualPath(url);

			output.push(start + "\"" + hashedUrl + "\"" + end);
		} else {
			output.push(line);
		}
	});

	return output.join("\n");
};

// var cwd = process.cwd();

// function mapPath(virtualPath) {
// 	return path.resolve(cwd, virtualPath);
// }

// var cssText = fs.readFileSync(mapPath("./assets/css-with-images.css"), "utf8");

// var processedCSS = processCss(cssText, function(imagePath) {
// 	return imagePath + "_hashed";
// });

// console.log(processedCSS);