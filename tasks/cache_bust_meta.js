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
    var glob = require('glob');
    var gruntTextReplace = require('grunt-text-replace/lib/grunt-text-replace');

    grunt.registerMultiTask('cache_bust_meta', 'Hash based cache busting for static assets with support for a meta hash covering all matched assets', function () {
        var options = this.options({
            deleteOriginals: false,
            separator: '.',
            hashLength: 8,
            replaceSrc: [],
            replaceDest: false,
            metaHashPlaceholder: '@@metaHash'
        });
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

            f.src.map(function (file) {
                file = path.normalize(file);
                return path.resolve(cwdAbs, (expand && cwd.length && (file.indexOf(cwd + path.sep) === 0)) ? file.substr(cwd.length + path.sep.length) : file);
            }).filter(function (file) {
                if (!grunt.file.exists(file)) {
                    grunt.log.warn('Source file "' + file + '" not found.');
                    return false;
                }
                return true;
            }).forEach(function (file) {
                var fileContents = grunt.file.read(file);
                var hash = crypto.createHash('md5').update(fileContents).digest('hex').substr(0, Math.max(8, options.hashLength));
                var outputDir = path.dirname(file);
                var fileExtension = path.extname(file);
                var fileBasename = path.basename(file, fileExtension);
                var hashedFile = outputDir + path.sep + fileBasename + options.separator + hash + fileExtension;

                if (options.deleteOriginals) {
                    fs.renameSync(file, hashedFile);
                } else {
                    fs.copySync(file, hashedFile);
                }

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
            hashReplacements.push({
                from: options.metaHashPlaceholder,
                to: crypto.createHash('md5').update(hashes.join('-')).digest('hex').substr(0, Math.max(8, options.hashLength))
            });
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
