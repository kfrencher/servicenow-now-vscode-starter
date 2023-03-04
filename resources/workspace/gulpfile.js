const gulp = require('gulp');
const concat = require('gulp-concat');
const ts = require('gulp-typescript');
const clean = require('gulp-clean');
const replace = require('gulp-replace');
const mergeStream = require('merge-stream');
const JSON5 = require('json5');
const log = require('fancy-log');

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
            .on('end', () => log('Starting concatenating ' + appInfo.scriptIncludePath + '.js'))
            .pipe(concat(name + '.js'))
            .on('end', () => log('Finished concatenating ' + name + '.js'));
    });

    return mergeStream(...mergedLibraries)
        .pipe(gulp.dest('dist'));
});

gulp.task('clean', function() {
    return gulp.src(['dist', 'node_modules/@types/node'], {
            read: false,
            allowEmpty: true
        })
        .pipe(clean());
});

gulp.task('compile', function() {
    return gulp.src('dist/*.js')
        .pipe(ts({
            "target": "es2020",
            "allowJs": true,
            "declaration": true
        })).dts.pipe(gulp.dest('dist/types'));
});

gulp.task('postProcess', function() {

    /**
     * Wraps the typescript class in a global namespace
     * @param {NodeJS.ReadWriteStream} stream 
     * @param {name} className 
     */
    function wrapInGlobalNamespace(stream, className) {
        return (
            // By default typescript is creating a ${className} in the global namespace
            // I'm manually placing it in the global namespace by wrapping the class in a global namespace
            stream.pipe(replace(new RegExp(`declare function ${className}`), `declare namespace global {\nexport function ${className}`))
            .pipe(replace(new RegExp(`declare class ${className}`), `export class ${className}`))
            .pipe(replace(new RegExp(`type: '${className}';`), `type: '${className}';\n}`))

            // Typescript also produces this export statement that I need to remove
            .pipe(replace(new RegExp(`export { ${className} };`), ''))
        );
    }

    // Need to remove text from some specific typescript files
    // first look for a g_klf.d.ts file
    // I'm removing the export of KLF_LdapGroupService and KLF_SPUtils. These
    // exports are generated in error. I'm manually correcting them by removing
    // the export statements from the g_klf.d.ts file.

    let stream = gulp.src('dist/types/g_klf.d.ts');
    stream = wrapInGlobalNamespace(stream, 'KLF_LdapGroupService');
    stream = wrapInGlobalNamespace(stream, 'KLF_SPUtils');
    return stream.pipe(gulp.dest('dist/types'));
});

gulp.task('default', gulp.series('clean', 'concat', 'compile', 'postProcess'));