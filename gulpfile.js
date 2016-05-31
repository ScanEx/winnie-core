var gulp = require('gulp');
var concat = require('gulp-concat');

gulp.task('css', function() {
    return gulp.src('gmxApplication.css')
        .pipe(gulp.dest('dist'));
});

gulp.task('js', function() {
    return gulp.src([
            'lib/PagingView.js',
            'lib/FullscreenControlMixin.js',
            'lib/FullscreenPagingPaneControl.js',
            'lib/MobileButtonsPaneControl.js',
            'lib/gmxTreeParser.js',
            'runtime/_header.js',
            'runtime/core.js',
            'runtime/map.js',
            'runtime/layers.js',
            'runtime/controls.js',
            'runtime/containers.js',
            'runtime/widgets.js',
            'runtime/tail.js',
            'runtime/_footer.js'
        ])
        .pipe(concat('gmxApplication.js'))
        .pipe(gulp.dest('dist'));
});

gulp.task('default', ['js', 'css']);
