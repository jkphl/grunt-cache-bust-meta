/*
 * grunt-cache-bust-meta
 * https://github.com/jkphl/grunt-cache-bust-meta
 *
 * Copyright (c) 2015 Joschi Kuphal
 * Licensed under the MIT license.
 */
'use strict';

module.exports = function (grunt) {
	require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

	// Project configuration.
	grunt.initConfig({
		jshint: {
			all: [
				'Gruntfile.js',
				'tasks/*.js',
				'<%= nodeunit.tests %>'
			],
			options: {
				jshintrc: '.jshintrc'
			}
		},

		// Before generating any new files, remove any previously-created files.
		clean: {
			tests: ['tmp']
		},

		copy: {
			main: {
				files: [
					{expand: true, cwd: 'test/fixtures/', src: ['**'], dest: 'tmp/'},
				],
			},
		},

		// Configuration to be run (and then tested).
		cache_bust_meta: {
			dist: {
				options: {
					deleteOriginals: false,
					replaceSrc: ['tmp/index.html'],
					replaceDest: 'tmp/index.hashed.html'
				},
				expand: true,
				cwd: 'tmp',
				src: ['css/style.min.css', 'js/script.js'],
			}
		},

		// Unit tests.
		nodeunit: {
			tests: ['test/*_test.js']
		}
	});

	// Actually load this plugin's task(s).
	grunt.loadTasks('tasks');

	// Whenever the "test" task is run, first clean the "tmp" dir, then run this
	// plugin's task(s), then test the result.
	grunt.registerTask('test', ['clean', 'copy', 'cache_bust_meta', 'nodeunit']);

	// By default, lint and run all tests.
	grunt.registerTask('default', ['jshint', 'test']);
};
