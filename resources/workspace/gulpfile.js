const gulp = require('gulp');
const concat = require('gulp-concat');
const clean = require('gulp-clean');
const mergeStream = require('merge-stream');
const JSON5 = require('json5');
const log = require('fancy-log');
const ignore = require('gulp-ignore');

function getScopedAppInfo() {
    // read file into a variable
    const fs = require('fs');
    const path = require('path');
    const tsConfigPath = path.join(__dirname, 'tsconfig.json');
    const tsConfigJson = fs.readFileSync(tsConfigPath, 'utf8');
    // parse the JSON
    const tsConfig = JSON5.parse(tsConfigJson);
    return tsConfig.serviceNowScopedAppInfo;
}

gulp.task('concat', function() {
    // combine .js files in the src folder into one file
    const scopedAppInfo = getScopedAppInfo();

    const mergedLibraries = scopedAppInfo.map(function(appInfo) {
        const name = appInfo.name.toLowerCase().replace(' ', '_');
        return gulp.src(`${appInfo.scriptIncludePath}/**/*.js`)
            .pipe(ignore.exclude('**/*Test.script.js'))
            .pipe(ignore.exclude('KLF_TestJasmineMatchers.script.js'))
            .pipe(ignore.exclude('KLF_TestChance.script.js'))
            .on('end', () => log('Starting concatenating ' + appInfo.scriptIncludePath + '.js'))
            .pipe(concat(name + '.js'))
            .on('end', () => log('Finished concatenating ' + name + '.js'));
    });

    return mergeStream(...mergedLibraries)
        .pipe(gulp.dest('dist'));
});

gulp.task('clean', function() {
    return gulp.src(['dist', 'build'], {
            read: false,
            allowEmpty: true
        })
        .pipe(clean());
});

gulp.task('build', gulp.series('clean', 'concat'));

gulp.task('deploy', gulp.series('build', function() {
    // copy the files to the deploy directory
    const workspaceDir = '../servicenow-now-vscode-starter/resources/workspace';
    const distDir = 'dist';

    gulp.src(`${distDir}/*.js`)
        .pipe(gulp.dest(`${workspaceDir}/lib/dts`));

    return gulp.src('gulpfile.js')
        .pipe(gulp.dest(`${workspaceDir}`));
}));


gulp.task('default', gulp.series('build'));