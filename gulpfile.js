var gulp = require('gulp');

gulp.task('default', function () {
    return gulp.src(['gmxApplication.js', 'gmxApplication.css'])
        .pipe(gulp.dest('dist'));
});
