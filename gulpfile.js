// gulp-plumber 防止編譯出錯時造成的程式中斷
// gulp-postcss 優化CSS
// autoprefixer 針對瀏覽器的不同增加前贅詞
// gulp-load-plugins 針對『gulp-*』的套件才可使用，套件無須載入(require)精簡寫法
// browserSync 開起虛擬伺服器
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var autoprefixer = require('autoprefixer');
var mainBowerFiles = require('main-bower-files');
var browserSync = require('browser-sync').create();
var minimist = require('minimist');

var envOptions = {
	string: 'env',
	default: { env : 'develop' }
}
var options = minimist(process.argv.slice(2), envOptions)
console.log(options)

// 清空指定資料夾 指令：gulp clean
gulp.task('clean', function () {
	return gulp.src(['./.tmp', './public'], { read: false, allowEmpty: true })
		.pipe($.clean())
})

// 複製指定檔案 指令：gulp copyHTML
gulp.task('copyHTML', function(){
	return gulp.src('./source/**/*.html')
		.pipe($.plumber())
		.pipe(gulp.dest('./public/'))
		.pipe(browserSync.stream())
});

// SCSS編譯 指令：gulp sass
gulp.task('sass', function () {
	return gulp.src('./source/scss/**/*.scss')
		.pipe($.plumber())
		.pipe($.sourcemaps.init())
		.pipe($.sass({
			outputStyle: 'nested',
			includePaths: ['./node_modules/bootstrap/scss']
		}).on('error', $.sass.logError))
		// ↑↑ 已編譯完成 下一步準備輸出 ↑↑
		.pipe($.postcss([autoprefixer()]))
		// ↑↑ 輸出前先優化CSS ↑↑
		.pipe($.if(options.env === 'production', $.cleanCss()))
		.pipe($.sourcemaps.write('.'))
		.pipe(gulp.dest('./public/css'))
		.pipe(browserSync.stream())
});

// JS編譯 指令：gulp babel
gulp.task('babel', () =>
	gulp.src('./source/js/**/*.js')
		.pipe($.sourcemaps.init())
		.pipe($.babel({
			presets: ['@babel/env']
		}))
		.pipe($.concat('all.js'))
		.pipe($.if(options.env === 'production', $.uglify({
			compress: {
				drop_console: true
			}
		})))
		.pipe($.sourcemaps.write('.'))
		.pipe(gulp.dest('./public/js'))
		.pipe(browserSync.stream())
);

// 套件管理 Bower
gulp.task('bower', function () {
	return gulp.src(mainBowerFiles())
		.pipe(gulp.dest('./.tmp/vendors'))
});
// 將 Bower 的 .js 檔案合併成一個
gulp.task('vendorJS', function(){
	return gulp.src([
		'./.tmp/vendors/**/*.js',
		'./node_modules/bootstrap/dist/js/bootstrap.bundle.js'
		])
		.pipe($.order([
			'jquery.js',
			'bootstrap.js'
		]))
		.pipe($.concat('vendors.js'))
		.pipe($.if(options.env === 'production', $.uglify()))
		.pipe(gulp.dest('./public/js'))
})

// 圖片壓縮
gulp.task('image-min', function(){
	return gulp.src('./source/images/*')
		.pipe($.if(options.env === 'productino', $.imagemin()))
		.pipe(gulp.dest('./public/images'))
})

// 上傳到原有的 Github 內產生 gh-pages 分支
// 上傳後即可用網址觀看
gulp.task('deploy', function () {
	return gulp.src('./public/**/*')
		.pipe($.ghPages());
});

// gulp 3.x 版虛擬伺服器開在指定路徑下
// gulp.task('bower-sync', function(){
// 	browserSync.init({
// 		server: {
// 			baseDir: "./public"
// 		},
// 		reloadDebounce: 2000
// 	})
// })

// gulp 3.x 版監控指定資料夾 指令：gulp watch
// 無法監控到『新增』及『刪除』的檔案更動
// gulp.task('watch', function () {
// 	gulp.watch('./source/**/*.html', ['copyHTML']);
// 	gulp.watch('./source/scss/**/*.scss', ['sass']);
// 	gulp.watch('./source/js/**/*.js', ['babel']);
// });

// gulp 3.x 版一次執行所有『正式用』任務流程 指令：gulp sequence
// gulp.task('build', $.sequence('clean', 'copyHTML', 'sass', 'babel', 'vendorJS', 'image-min'));

// gulp 3.x 版一次執行所有『開發用』任務流程 指令：gulp
// gulp.task('default', ['copyHTML', 'sass', 'babel', 'vendorJS', 'image-min', 'bower-sync', 'watch']);

// gulp 4.0 指令 (parallel / series)
// parallel 同時執行
// series 依序執行

gulp.task('build'
	,gulp.series(
		'clean',
		'bower',
		'vendorJS',
		gulp.parallel('copyHTML', 'sass', 'babel', 'image-min')
	)
)

gulp.task('default'
	, gulp.series(
		'clean',
		'bower',
		'vendorJS',
		gulp.parallel('copyHTML', 'sass', 'babel', 'image-min'),
		function(done){
			// gulp 4.0 browserSync 指令寫法
			browserSync.init({
				server: {
					baseDir: "./public"
				},
				reloadDebounce: 2000
			})
			// gulp 4.0 watch 指令寫法
			gulp.watch(['./source/**/*.html'], gulp.series('copyHTML'));
			gulp.watch(['./source/scss/**/*.scss'], gulp.series('sass'));
			gulp.watch(['./source/js/**/*.js'], gulp.series('babel'));
			done();
		}
	)
)
