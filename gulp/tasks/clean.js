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
 
var gulp   = require('gulp'),
    clean  = require('gulp-clean'),
    config = require('../config');

gulp.task('clean-post', function () {
    return gulp.src(config.stage)
        .pipe(clean({force: true}));
});

gulp.task('clean', function () {
    return gulp.src(config.dist)
        .pipe(clean({force: true}));
});