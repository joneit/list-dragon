'use strict';

var gulp        = require('gulp'),
    $$          = require('gulp-load-plugins')(),
    runSequence = require('run-sequence'),
    browserSync = require('browser-sync').create(),
    exec        = require('child_process').exec,
    path        = require('path');

var srcDir  = './src/',
    testDir = './test/',
    jsDir   = srcDir + 'js/',
    jsFiles = '**/*.js';

var js = {
    dir   : jsDir,
    files : jsDir + jsFiles
};

//  //  //  //  //  //  //  //  //  //  //  //

gulp.task('lint', lint);
gulp.task('test', test);
gulp.task('doc', doc);

gulp.task('build', function(callback) {
    clearBashScreen();
    runSequence('lint', 'test', 'doc',
        callback);
});

gulp.task('watch', function () {
    gulp.watch([srcDir + '**', testDir + '**'], ['build'])
        .on('change', function(event) {
            browserSync.reload();
        });
});

gulp.task('default', ['build', 'watch'], function() {
    browserSync.init({
        server: {
            // Serve up our build folder
            baseDir: srcDir,
            routes: {
                "/bower_components": "bower_components",
                "/node_modules": "node_modules"
            }
        },
        port: 5000
    });
});

function lint() {
    return gulp.src(js.files)
        .pipe($$.excludeGitignore())
        .pipe($$.eslint())
        .pipe($$.eslint.format())
        .pipe($$.eslint.failAfterError());
}

function test(cb) {
    return gulp.src(testDir + 'index.js')
        .pipe($$.mocha({reporter: 'spec'}));
}

function doc(cb) {
    exec(path.resolve('jsdoc.sh'), function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
}

function clearBashScreen() {
    var ESC = '\x1B';
    console.log(ESC + 'c'); // (VT-100 escape sequence)
}
