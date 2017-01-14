var path = require("path");
var fs = require("fs");
var minimist = require("minimist");
var hashly = require("./hashly");
var pluginLoader = require("./plugin-loader");

function readStdin(stdin, cwd, callback) {
    stdin.setEncoding("utf8");

    var data = "";

    stdin.on("readable", function () {
        var chunk = this.read();
        if (chunk === null) {
            if (data) {
                return;
            } else {
                callback(null);
            }
        } else {
            data += chunk;
        }
    });

    stdin.on("end", function () {
        var files = data.split("\n")
            .filter(function (f) {
                return !!f.trim();
            })
            .map(function (f) {
                return path.resolve(cwd, f).trim();
            });

        callback(files);
    });
}

function processArgs(argv, cwd) {
    var args = minimist(argv.slice(2), {
        "boolean": ["verbose", "clean", "ignore-errors", "help", "skip-css", "amend", "quickhash", "ignore-plugin-errors", "skip-map"],
        "string": ["exclude", "include", "manifest-format", "manifest-path", "plugins", "clean-old", "base-dir", "passthrough", "disabled-plugins", "sourcemap-url-prefix", "hash-length", "rename-format"],
        "alias": {
            "verbose": "v",
            "clean": "c",
            "exclude": "e",
            "manifest-format": "m",
            "ignore-errors": "i",
            "help": "h",
            "plugins": "p",
            "skip-css": "s",
            "amend": "a",
            "quickhash": "q",
            "hash-length": "l",
            "rename-format": "f",
            "base-dir": "b"
        }
    });

    if (args.help) {
        return {
            showHelp: true
        };
    }

    var sourceDir = cwd;

    if (args._.length >= 1) {
        sourceDir = path.resolve(cwd, args._[0]);
    }

    var targetDir = sourceDir;

    if (args._.length >= 2) {
        targetDir = path.resolve(cwd, args._[1]);
    }

    var options = {
        exclude: args.exclude || null,
        include: args.include || null,
        passthrough: args.passthrough || null,
        manifestFormat: args["manifest-format"],
        manifestPath: args["manifest-path"] ? path.resolve(cwd, args["manifest-path"]) : null,
        continueOnError: args["ignore-errors"] || false,
        continueOnPluginError: args["ignore-plugin-errors"] || false,
        processCss: !args["skip-css"],
        processMap: !args["skip-map"],
        quickhash: args["quickhash"],
        amend: args["amend"],
        cleanOldDays: parseInt(args["clean-old"]),
        baseDir: args["base-dir"],
        sourcemapURLPrefix: args["sourcemap-url-prefix"] || "",
        disabledPlugins: args["disabled-plugins"] ? args["disabled-plugins"].split(";") : null,
        hashLength: parseInt(args["hash-length"]),
        renameFormat: args["rename-format"]
    };

    return {
        options: options,
        sourceDir: sourceDir,
        targetDir: targetDir,
        clean: (args.c || args.clean || false),
        plugins: args.plugins,
        verbose: args.verbose,
        cleanOld: !isNaN(options.cleanOldDays)
    };
}

function loadPlugins(additionalDir, cwd, loadedCallback, disabledPlugins) {
    var plugins = [];

    // Load default plugins
    var pluginsDir = path.resolve(__dirname, "../plugins");
    pluginLoader.loadDirectory(pluginsDir, plugins, disabledPlugins);

    // Load additional plugins specified on the command line
    if (additionalDir) {
        pluginLoader.loadDirectory(path.resolve(cwd, additionalDir), plugins, disabledPlugins);
    }

    plugins.forEach(function (plugin) {
        loadedCallback(plugin.name);
    });

    return plugins;
}

function main(files, argv, cwd, stdout, stderr) {

    var args = processArgs(argv, cwd, stderr);

    if (args.showHelp) {
        console.log(fs.readFileSync(path.resolve(__dirname, "../lib/usage.txt"), "utf8"));
        process.exit(0);
    }

    var options = args.options;
    var exitCode = 0;

    // Setup loggers
    options.logger = args.verbose ? function (msg) {
        stdout.write(msg + "\n");
    } : null;

    options.logError = function (msg) {
        stderr.write(msg + "\n");
    };

    if (args.clean) {
        exitCode = hashly.clean(args.targetDir, options);
    } else if (args.cleanOld) {
        exitCode = hashly.cleanOld(args.targetDir, options);
    } else {
        options.plugins = loadPlugins(args.plugins, cwd, function (pluginName) {
            if (options.verbose) {
                console.log("Loaded plugin: " + pluginName + "...");
            }
        }, options.disabledPlugins);

        if (files) {
            exitCode = hashly.processFiles(files, args.sourceDir, args.targetDir, options);
        } else {
            exitCode = hashly.processDirectory(args.sourceDir, args.targetDir, options);
        }
    }

    return exitCode;
}

exports.execute = function (stdin, stdout, stderr, argv, cwd, callback) {
    readStdin(stdin, cwd, function (files) {
        main(files, argv, cwd, stdout, stderr);
        callback(0);
    });
};