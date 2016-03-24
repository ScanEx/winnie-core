var gulp = require('gulp');
var concat = require('gulp-concat');

gulp.task('css', function() {
    return gulp.src('gmxApplication.css')
        .pipe(gulp.dest('dist'));
});

gulp.task('js', function() {
    return gulp.src([
            'src/_header.js',
            'src/core.js',
            'src/map.js',
            'src/layers.js',
            'src/controls.js',
            'src/widgets.js',
            'src/tail.js',
            'src/_footer.js'
        ])
        .pipe(concat('gmxApplication.js'))
        .pipe(gulp.dest('dist'));
});

gulp.task('default', ['js', 'css']);
