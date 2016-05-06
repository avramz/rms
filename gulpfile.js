var gulp = require('gulp'),
    plugins = require('gulp-load-plugins')();

gulp.task('uglify', function(){
    return gulp.src('./dist/multi-range-slider.js')
        .pipe(plugins.plumber())
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.uglify())
        .pipe(plugins.sourcemaps.write('./'))
        .pipe(plugins.rename({suffix: '.min'}))
        .pipe(gulp.dest('dist'));
});

gulp.task('js-hint', function(){
   return  gulp.src('multi-range-slider.js')
       .pipe(plugins.jshint())
       .pipe(plugins.jshint.reporter('default', { verbose: true }))
       .pipe(plugins.jshint.reporter('fail'));
});

gulp.task('default', ['js-hint', 'uglify']);

