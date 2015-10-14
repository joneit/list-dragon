'use strict';

var gulp        = require('gulp'),
    $$          = require('gulp-load-plugins')(),
    runSequence = require('run-sequence'),
    browserSync = require('browser-sync').create(),
    exec        = require('child_process').exec,
    path        = require('path'),
    inject      = require('gulp-inject'),
    escapeStr   = require('js-string-escape'),
    CleanCss    = require("clean-css"),
    rename      = require('gulp-rename');

var srcDir  = './src/',
    testDir = './test/',
    jsDir   = srcDir + 'js/',
    jsFiles = '**/*.js',
    destDir = './';

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
    runSequence('lint', 'test', 'doc', 'inject-css',
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
            baseDir: srcDir,
            routes: {
                "/bower_components": "bower_components",
                "/node_modules": "node_modules"
            }
        },
        port: 5000
    });
});

gulp.task('inject-css', function () {
    var target = gulp.src(jsDir + 'list-dragon.js'),
        source = gulp.src(srcDir + 'css/list-dragon.css'),
        destination = gulp.dest(destDir);

    target
        .pipe(inject(source, {
            transform: cssToJsFn,
            starttag: '/* {{name}}:{{ext}} */',
            endtag: '/* endinject */'
        }))
        .pipe(rename('index.js'))
        .pipe(destination);
});

function cssToJsFn(filePath, file) {
    var STYLE_HEADER = '(function(){var a="',
        STYLE_FOOTER = '",b=document.createElement("style"),head=document.head||document.getElementsByTagName("head")[0];b.type="text/css";if(b.styleSheet)b.styleSheet.cssText=a;else b.appendChild(document.createTextNode(a));head.insertBefore(b,head.firstChild)})();';

    var css = new CleanCss({})
        .minify(file.contents.toString())
        .styles;

    file.contents = new Buffer(STYLE_HEADER + escapeStr(css) + STYLE_FOOTER);

    return file.contents.toString('utf8');
}

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
