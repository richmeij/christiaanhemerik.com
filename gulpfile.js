'use strict';

const gulp = require('gulp');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const gutil = require('gulp-util');
const Comb = require('csscomb');
const combConfig = require('./.csscomb.json');
const comb = new Comb(combConfig);
const cleanCSS = require('gulp-clean-css');

const settings = {
	src: {
		scss: ['scss/**/*.scss']
	},
	dist: {
		css: 'css/'
	},
	combExcludedGlobs: combConfig.exclude,
	keepSpecialComments: 0, // NOTE: Use 0 to strip all special comments (comments starting with /*!), 1 to keep the first special comment in the document and '*' for all special comments.
	compileSCSSOnWatch: true
};

/**
 * Minify main.css to main.min.css
 * @return {void}
 */
function minifyCss() {
	let stream = {};

	stream = gulp.src(settings.dist.css + 'main.css')
	   .pipe(cleanCSS({keepSpecialComments: settings.keepSpecialComments}))
	   .pipe(rename({ suffix: '.min' }))
	   .pipe(gulp.dest(settings.dist.css));

	stream.on('end', function() {
		gutil.log('Minified css');
	});
}

/**
 * Compile SCSS to css
 * @param {Boolean} shouldMinify - Should the css be minified
 * @return {void}
 */
function compileScss(shouldMinify) {
	let hasCompileError = false;
	let stream = {};

	stream = gulp.src(settings.src.scss)
	    .pipe(sass({outputStyle: 'expanded'}).on('error', function(error) {
			hasCompileError = true;
			sass.logError.bind(this)(error);
		}))
	    .pipe(gulp.dest(settings.dist.css));

	stream.on('end', function() {
		if (!hasCompileError) {
			gutil.log('Compiled SCSS to CSS');

			if (shouldMinify) {
				minifyCss();
			}
		}
	});
}

gulp.task('watchScss', function() {
	const scssWatcher = gulp.watch(settings.src.scss, function() {
		if (settings.compileSCSSOnWatch) {
			compileScss(false);
		}
	});

	/**
	 * Checks if the inserted path occurs in the exclude array inside the csscomb.json file
	 * @param {string} path - A file or folder path
	 * @return {Boolean} - Is the checked file excluded
	 */
	function isExcludedPath(path) {
		const excludedPaths = settings.combExcludedGlobs;

		return (excludedPaths.filter(function(excludePath) {
			return (path.indexOf(excludePath) >= 0);
		}).length > 0);
	}

	/**
	 * Checks if the changed file needs to be combed
	 * @param {object} event - Gulp event
	 * @return {void}
	 */
	function checkScssFile(event) {
		gutil.log('Harbour ⚓  ---------------------------------------------------------'); // NOTE: Extra space after emoji to fix emoji (bug!?) in terminal
		gutil.log('Change in: ' + event.path);

		if (event.type === 'changed' && !isExcludedPath(event.path)) {
			comb.processFile(event.path);

			gutil.log('Combed: '+ event.path);
		}
	}

	scssWatcher.on('change', checkScssFile);
})

gulp.task('buildCss', function() {
	compileScss(true);
});

// CLI Tasks
gulp.task('watch', ['watchScss']);
gulp.task('build', ['buildCss']);
