/*
 * grunt-cache-bust-meta
 * https://github.com/jkphl/grunt-cache-bust-meta
 *
 * Copyright (c) 2015 Joschi Kuphal
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {
    var fs = require('fs-extra');
    var path = require('path');
    var crypto = require('crypto');
    var gruntTextReplace = require('grunt-text-replace/lib/grunt-text-replace');

    grunt.registerMultiTask('cache_bust_meta', 'Hash based cache busting for static assets with support for a meta hash covering all matched assets', function () {

		// Read in the task options
        var options = this.options({
            deleteOriginals: false,
            separator: '.',
            hashLength: 8,
            replaceSrc: [],
            replaceDest: false,
            metaHashPlaceholder: '@@metaHash'
        });

		// Define a simple rtrim function
        var rtrim = function (str, strip) {
            while (str.length && strip.length && (str.substr(-strip.length) === strip)) {
                str = str.substr(0, str.length - strip.length);
            }
            return str;
        };
        var hashReplacements = [];
        var hashes = [];

        // Iterate over all specified file groups.
        this.files.forEach(function (f) {
            var cwd = rtrim(path.normalize(f.orig.cwd || ''), path.sep);
            var cwdAbs = path.resolve(cwd || '.');
            var expand = !!f.orig.expand;

			// Normalize the file path
            f.src.map(function (file) {
                file = path.normalize(file);
                return path.resolve(cwdAbs, (expand && cwd.length && (file.indexOf(cwd + path.sep) === 0)) ? file.substr(cwd.length + path.sep.length) : file);

			// Ensure the file exists
            }).filter(function (file) {
                if (!grunt.file.exists(file)) {
                    grunt.log.warn('Source file "' + file + '" not found.');
                    return false;
                }
                return true;

			// Create a hash for the file contents and include it in the file name
            }).forEach(function (file) {
                var fileContents = grunt.file.read(file);
                var hash = crypto.createHash('md5').update(fileContents).digest('hex').substr(0, Math.max(8, options.hashLength));
                var outputDir = path.dirname(file);
                var fileExtension = path.extname(file);
                var fileBasename = path.basename(file, fileExtension);
                var hashedFile = outputDir + path.sep + fileBasename + options.separator + hash + fileExtension;

				// Rename the original file
                if (options.deleteOriginals) {
                    fs.renameSync(file, hashedFile);

				// ... or create a copy with the hashed file name
                } else {
                    fs.copySync(file, hashedFile);
                }

                // Register the file hash
                if (fs.existsSync(hashedFile)) {
                    hashes.push(hash);
                    hashReplacements.push({from: path.relative(cwdAbs, file), to: path.relative(cwdAbs, hashedFile)});
                    grunt.log.ok('Successfuly hashed file "%s"', path.relative(cwdAbs, file));
                } else {
                    grunt.log.error('Failed hashing file "%s"', path.relative(cwdAbs, file));
                }
            });
        }, this);

        // If there are some templates to process
        if (options.replaceSrc.length) {

			// Create and add a meta hash
            hashReplacements.push({
                from: options.metaHashPlaceholder,
                to: crypto.createHash('md5').update(hashes.join('-')).digest('hex').substr(0, Math.max(8, options.hashLength))
            });

			// Run replacements on all registered resources
            var gruntTextReplaceOptions = {
                src: options.replaceSrc,
                replacements: hashReplacements
            };
            if (options.replaceDest) {
                gruntTextReplaceOptions.dest = options.replaceDest;
            } else {
                gruntTextReplaceOptions.overwrite = true;
            }
            gruntTextReplace.replace(gruntTextReplaceOptions);
        }
    });
};
