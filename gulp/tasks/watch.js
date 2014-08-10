/*!
 * Copyright (C) 2010-2014 by Revolution Analytics Inc.
 *
 * This program is licensed to you under the terms of Version 2.0 of the
 * Apache License. This program is distributed WITHOUT
 * ANY EXPRESS OR IMPLIED WARRANTY, INCLUDING THOSE OF NON-INFRINGEMENT,
 * MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. Please refer to the
 * Apache License 2.0 (http://www.apache.org/licenses/LICENSE-2.0) for more 
 * details.
 */
 
var gulp       = require('gulp'),
    livereload = require('gulp-livereload'),
    config     = require('../config');

gulp.task('watch', function() {
    var server = livereload(),
        reload = function(file) {
        	server.changed(file.path);
        };

	gulp.watch([config.name + '.js', 'lib/**'], ['build']);
	gulp.watch([config.dist + '/**']).on('change', reload);
});