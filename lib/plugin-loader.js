"use strict";

var fsutil = require("./file-system-util");
var path = require("path");



exports.loadDirectory = function (directory, plugins, disabledPlugins) {
    plugins = plugins || [];

    fsutil.recurseDirSync(directory, function (file) {
        if (path.extname(file) == ".js") {
            try {
                var plugin = require(file);
                if (plugin.processFile) {
                    plugin.name = path.basename(file, ".js");
                    if (!disabledPlugins || disabledPlugins.indexOf(plugin.name) < 0) {
                        plugins.push(plugin);
                    }
                }
            } catch (ex) {
                // Probably not a plugin
            }
        }
    });

    return plugins;
};