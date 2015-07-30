var fs = require('fs');

module.exports = function(grunt) {

  var browsers = grunt.option('browser') ? grunt.option('browser').split(',') : ['PhantomJS'];

  var copyright = '/*! <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
                   '*   Copyright (c) <%= grunt.template.today("yyyy") %> Environmental Systems Research Institute, Inc.\n' +
                   '*   Apache 2.0 License ' +
                   '*/\n\n';

  var files = [
    'src/EsriLeafletGP.js',
    'src/Services/Geoprocessing.js',
    'src/Tasks/Geoprocessing.js'
  ];

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      options: {
        jshintrc: '.jshintrc',
        ignore_warning: {
          options: {
            '-W098': false,
          },
          src: ['src/EsriLeafletGP.js'],
        }
      },
      all: ['src/Tasks/Geoprocessing.js', 'src/Services/Geoprocessing.js']
    },

    concat: {
      options: {
        sourceMap: true,
        separator: '\n\n',
        banner: copyright
      },
      js: {
        src: [
          'src/EsriLeafletGP.js',
          'src/Services/Geoprocessing.js',
          'src/Tasks/Geoprocessing.js'
        ],
        dest: 'dist/esri-leaflet-gp-src.js'
      }
    },

    uglify: {
      options: {
        wrap: false,
        preserveComments: 'some',
        report: 'gzip',
        banner: copyright,
        sourceMap: true,
        sourceMapIncludeSources: true
      },
      dist: {
        files: {
          'dist/esri-leaflet-gp.js': [
            'dist/esri-leaflet-gp-src.js'
          ]
        }
      }
    },

    karma: {
      options: {
        configFile: 'karma.conf.js'
      },
      run: {
        reporters: ['progress'],
        browsers: browsers
      },
      coverage: {
        reporters: ['progress', 'coverage'],
        browsers: browsers,
        preprocessors: {
          'src/**/*.js': 'coverage'
        }
      },
      watch: {
        singleRun: false,
        autoWatch: true,
        browsers: browsers
      }
    },

    watch: {
      scripts: {
        files: [
          'src/**/*.js',
          'src/*.js'
        ],
        tasks: ['jshint'],
        options: {
          spawn: false
        }
      }
    },

    concurrent: {
      options: {
        logConcurrentOutput: true
      },
      dev: ['watch:scripts', 'karma:watch']
    },

    releaseable: {
      release: {
        options: {
          build: 'npm run prepublish',
          remote: 'origin',
          dryRun: grunt.option('dryRun') ? grunt.option('dryRun') : false,
          silent: false
        },
        src: [ 'dist/**/*.js','dist/**/*.map' ]
      }
    }
  });

  grunt.registerTask('default', ['build']);
  grunt.registerTask('build', ['jshint', 'concat', 'uglify']);
  grunt.registerTask('test', ['jshint', 'karma:run']);
  grunt.registerTask('release', ['releaseable']);
  grunt.registerTask('prepublish', ['concat', 'uglify']);

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-releaseable');

};