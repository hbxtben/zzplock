var gulp = require("gulp"),
    Browsersync = require("browser-sync").create(),
    reload = Browsersync.reload;
gulpLoadPlugins = require("gulp-load-plugins");
var $ = gulpLoadPlugins();
gulp.task("es6", function() {
    return gulp.src('./src/*.js')
        .pipe($.babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('./lib'))
        .pipe(reload({stream: true}));
})
gulp.task("build", function() {
    return gulp.src("./lib/*.js")
        .pipe($.uglify())
        .pipe(gulp.dest("./lib"));
})
gulp.task("build-css", function() {
    return gulp.src("./style/css/*.css")
        .pipe($.autoprefixer())
        .pipe($.uglify())
        .pipe(gulp.dest('./style/css'));
})
gulp.task('less', function() {
    return gulp.src('./style/less/*.less')
        .pipe($.less())
        .pipe($.autoprefixer())
        .pipe(gulp.dest('./style/css'))
        .pipe(reload({ stream: true }));
});
gulp.task("server", ["es6", "less"], function() {
    Browsersync.init({
        server: {
            baseDir: "./"
        }
    })
    gulp.watch("./*.html", reload);
    gulp.watch("./style/less/*.less", ['less']);
    gulp.watch("./src/*.js", ['es6']);
})


