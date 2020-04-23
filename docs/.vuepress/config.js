module.exports = {
  title: 'Styx',
  description: 'Just playing around',
  themeConfig: {
    head: [
      ['link', { rel: 'shortcut icon', href: '../favicon.ico' }],
    ],
    nav: [
      { text: 'Home', link: '/' },
      { 
        text: 'Blog',
        link: '/blog/JavaScript/',
        items: [
          { text: 'JavaScipt', link: '/blog/JavaScript/' },
          { text: 'Node', link: '/blog/Node/' },
          { text: '前端构建', link: '/blog/FontEnd_Construction/' }
        ]
      },
      { text: 'Projects', link: '/blog/Projects/' },
      { text: 'Github', link: 'https://github.com/Styx11' },
    ],
    sidebarDepth: 3,
    sidebar: {
      '/blog/JavaScript/': [
        '',
        'let_const',  /* /foo/one.html */
        'destruction',
        'es6_string',
        'array_expand',
        'func_expand',
        'obj_expand',
        'obj_expand_api',
        'es6_class_basic',
        'es6_class_extend',
        'promise_basic'
      ],
      '/blog/Node/': [
        '',
        'zlib',
      ],
      '/blog/FontEnd_Construction/': [
        '',
        'use_eslint',
        'module_basic',
        'ssr_first_part',
        'ssr_second_part',
        'ssr_third_part',
        'devMiddleware'
      ],
      '/blog/Projects/': [
        '',
        'one',
      ]
    }
  }
}