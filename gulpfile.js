/* global -$ */
'use strict';

var gulp = require('gulp');
var argv = require('yargs').argv;
var $ = require('gulp-load-plugins')();
var runSequence = require('run-sequence');
var browserSync = require("browser-sync").create();
var reload = browserSync.reload;
var webpackConfig = require("./webpack.config.js");

var path = {
    src: 'src/assets/',
    dist: 'public/assets/',
    tmp: '.tmp/assets/'
}

var browserList = {
  browsers: [
    'ie >= 10',
    'ff >= 36',
    'chrome >= 40',
    'iOS >= 8 ',
    'Android >= 4.4',
    'ChromeAndroid >= 40'
  ]
};

gulp.task('webpack', function() {
  return gulp.src(  path.src + 'scripts/main.js' )
    .pipe(require('webpack-stream')(webpackConfig))
    .pipe(gulp.dest( path.tmp + 'scripts/'))
    .pipe(reload({ stream: true }));
});

gulp.task('styles', function () {
  return gulp.src( path.src + 'styles/main.scss')
    .pipe($.sourcemaps.init())
    .pipe($.sass.sync({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.']
    }).on('error', $.sass.logError))
    .pipe($.postcss([
      require('postcss-will-change'),
      require('autoprefixer')({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR']}),
      require("css-mqpacker")({
        sort: true
      })
    ]))
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest( path.tmp + 'styles/'))
    .pipe(reload({stream: true}));
});

gulp.task('critical', function () {
  return gulp.src( path.src + 'styles/critical-*.scss')
    .pipe($.sass.sync({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.']
    }).on('error', $.sass.logError))
    .pipe($.postcss([
      require('postcss-will-change'),
      require('autoprefixer')({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR']}),
      require("css-mqpacker")({
        sort: true
      })
    ]))
    .pipe(gulp.dest('src/_includes/assets/'))
});

gulp.task( 'js-uglify', function() {
  return gulp.src([
      path.tmp + 'scripts/main.js',
      path.src + 'scripts/prism.js'
    ])
    .pipe( $.uglify() )
    .pipe( gulp.dest( path.dist + 'scripts/' ) );
});

gulp.task('jekyll', function () {
  return gulp.src('_config.yml')
    // .pipe($.if(argv.development, $.shell([ 'jekyll build --drafts --config <%= file.path %>' ])))
    // .pipe($.if(argv.production, $.shell([ 'JEKYLL_ENV=production jekyll build --config <%= file.path %> --incremental --quiet' ])))
    .pipe($.shell([ 'JEKYLL_ENV=production jekyll build --config <%= file.path %> --incremental --quiet' ]))
    .pipe(reload({stream: true}));
});

gulp.task('html', ['webpack', 'styles', 'jekyll'], function () {
  return gulp.src('public/**/*.html')
    .pipe($.useref({searchPath: ['.tmp', 'src', '.']}))
    .pipe($.if('*.js', $.uglify()))
    .pipe($.if('*.css', $.csso()))
    .pipe($.if('*.html', $.minifyHtml({conditionals: true, loose: true})))
    .pipe(gulp.dest('public'));
});

gulp.task('images', function() {
  return gulp.src( path.src + 'images/**/*')
    .pipe($.imagemin({
      progressive: true,
      interlaced: true,
      // don't remove IDs from SVGs, they are often used
      // as hooks for embedding and styling
      svgoPlugins: [{ cleanupIDs: false }]
    }))
    // .pipe(gulp.dest(path.tmp + 'images'))
    // .pipe($.if(argv.prod, gulp.dest(path.dist + 'images')));
    .pipe(gulp.dest(path.dist + 'images'));
});

gulp.task('fonts', function() {
  return gulp.src(require('main-bower-files')({
      filter: '**/*.{woff,woff2}'
    }).concat( path.src + 'fonts/**/*.css'))
    // .pipe(gulp.dest(path.tmp + 'fonts'))
    // .pipe($.if(argv.prod, gulp.dest(path.dist + 'fonts')));
    .pipe(gulp.dest(path.dist + 'fonts'));
});

gulp.task('extras', function () {
  return gulp.src([
    'src/*.*',
    '!src/feed.xml',
    '!src/*.html'
  ], {
    dot: true
  }).pipe(gulp.dest('public'));
});

gulp.task('clean', require('del').bind(null, ['.tmp', 'public']));

gulp.task('serve', ['webpack', 'styles', 'jekyll'], function () {
  browserSync.init({
    notify: false,
    ghostMode: false,
    open: false,
    port: 8080,
    server: {
      baseDir: ['.tmp', 'public', 'src'],
      routes: {
        '/bower_components': 'bower_components'
      }
    }
  });

  gulp.watch([
    'src/**/*.html',
     path.src + 'scripts/**/*.js',
     path.src + 'fonts/**/*',
     path.src + 'images/**/*'
  ]).on('change', reload);

  gulp.watch( path.src + 'styles/**/*.scss', ['styles']);
  gulp.watch( path.src + 'fonts/**/*', ['fonts']);
  gulp.watch( path.src + 'scripts/**/*.js', ['webpack']);
  gulp.watch('bower.json', ['wiredep', 'fonts']);
  gulp.watch('src/**/*.{md,markdown,html}', ['jekyll']);
});

gulp.task('wiredep', function () {
  var wiredep = require('wiredep').stream;

  gulp.src( path.src + 'styles/**/*.scss')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)+/
    }))
    .pipe(gulp.dest( path.src + 'styles'));

  gulp.src('src/**/*.html')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest('src'));
});

gulp.task('build', function(callback) {
  runSequence('clean',
    ['html', 'images', 'fonts', 'extras'],
    'js-uglify',
    function() {
      return gulp.src('public/**/*')
        .pipe($.size({title: 'build', gzip: true}));
    });
});

gulp.task('deploy', function() {
  return gulp.src('./public/**/*')
    .pipe($.ghPages());
});

gulp.task('default', function () {
  gulp.start('build');
});
