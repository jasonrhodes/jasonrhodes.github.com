var grunt     = require('grunt');
var path      = require('path');
var jade      = require('jade');
var fs        = require('fs');
var Pagemaki  = require('pagemaki');
var _         = require('lodash');
var moment    = require('moment');
var striptags = require('striptags');

var maker = new Pagemaki();

var templates = {
  post: jade.compileFile('./views/post.jade', { pretty: true }),
  page: jade.compileFile('./views/page.jade', { pretty: true }),
  home: jade.compileFile('./views/home.jade', { pretty: true }),
  'blog-home': jade.compileFile('./views/blog-home.jade', { pretty: true })
};

var firstGraphRegex = new RegExp('<p>(.*)<\/p>');

var postList = fs.readdirSync('src/blog').filter(function (post) {
  return post !== 'index.md';
}).map(function (post) { 
  var data = maker.parse(fs.readFileSync('src/blog/' + post).toString());
  var options = data.options;

  options.machineDate = moment(options.date).format('YYYY-MM-DD');
  options.prettyDate = moment(options.date).format('MMMM Do YYYY');
  options.teaser = options.teaser || striptags(firstGraphRegex.exec(data.content)[1]);
  options.url = '/blog/' + post.replace(/md$/, 'html');

  return options;
});

grunt.loadNpmTasks('grunt-markdown');
grunt.loadNpmTasks('grunt-contrib-copy');
grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-contrib-connect');
grunt.loadNpmTasks('grunt-contrib-clean');

function removeSrc(dest, src) {
  return path.join(dest, src.replace(/^src(\/pages)?/, ''));
}

var i = 0;

function getProcessor(defaultTemplate) {
  return function (content, srcpath) {
    var parsed = maker.parse(content);
    var options = parsed.options;
    var template = options.template || defaultTemplate;
    
    try {
      parsed.posts = postList;
      parsed.bylineDate = moment(options.date).format('MMMM Do, YYYY');
      var current = _.findIndex(postList, { title: options.title });

      parsed.prev = (current - 1) > -1 ? postList[current - 1] : false;
      parsed.next = (current + 1) < postList.length ? postList[current + 1] : false;
    } catch (err) {
      console.error(err);
      process.exit();
    }

    parsed = _.defaults({}, parsed, parsed.options);
    delete parsed.options;

    return templates[template](parsed).trim() + '\n';
  }
}

grunt.initConfig({
  copy: {
    css: {
      files: [
        {
          expand: true,
          src: 'src/assets/**/*.css',
          dest: '.',
          rename: removeSrc
        }
      ]
    },
    js: {
      files: [
        {
          expand: true,
          src: 'src/assets/**/*.js',
          dest: '.',
          rename: removeSrc
        }
      ]
    },
    posts: {
      expand: true,
      src: 'src/blog/**/*.md',
      dest: '.',
      ext: '.html',
      rename: removeSrc,
      options: {
        process: getProcessor('post')
      }
    },
    pages: {
      expand: true,
      src: 'src/pages/**/*.md',
      dest: '.',
      ext: '.html',
      rename: removeSrc,
      options: {
        process: getProcessor('page')
      }
    }
  },
  watch: {
    posts: {
      files: 'src/blog/**/*.md',
      tasks: ['clean:posts', 'copy:posts'],
      options: {
        livereload: true
      }
    },
    pages: {
      files: 'src/pages/**/*.md',
      tasks: ['clean:pages', 'copy:pages'],
      options: {
        livereload: true
      }
    },
    templates: {
      files: 'views/**/*.jade',
      tasks: ['copy:posts', 'copy:pages'],
      options: {
        livereload: true
      }
    },
    css: {
      files: 'src/assets/**/*.css',
      tasks: ['clean:css', 'copy:css'],
      options: {
        livereload: true
      }
    },
    js: {
      files: 'src/assets/**/*.js',
      tasks: ['clean:js', 'copy:js'],
      options: {
        livereload: true
      }
    }
  },
  connect: {
    server: {
      options: {
        port: 4000,
        hostname: 'localhost',
        livereload: true,
        open: true
      }
    }
  },
  clean: {
    posts: ['blog'],
    pages: fs.readdirSync('src/pages').map(function (file) { 
      return file.replace(/\.md$/, '.html'); 
    }),
    css: ['assets/css'],
    js: ['assets/js']
  }
});

grunt.registerTask('build', ['clean', 'copy']);
grunt.registerTask('default', ['build', 'connect:server', 'watch']);
grunt.registerTask('gindex', function () {
  var done = this.async();
  fs.readdir('./g', function (err, files) {
    var list = [], html = '';
    if (err) {
      console.error(err);
      return done();
    }
    files.forEach(function (f) {
      if (f === 'index.html') return;
      list.push('<li><a href="' + f + '">' + f + '</a></li>');
    });
    html = '<h1>/g index</h1><ul>' + list.join('') + '</ul>';
    fs.writeFile('./g/index.html', html, { flags: 'w' }, done);
  });
});