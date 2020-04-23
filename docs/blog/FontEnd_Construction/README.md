# Babel 转码器的使用
[Babel](https://babeljs.io/) 是一个广泛使用的 ES6 转码器，可以将 ES6 代码转为 ES5 代码，从而在现有环境执行。这意味着，你可以用 ES6 的方式编写程序，又不用担心现有环境是否支持。下面是一个例子。
```js
// 转码前
input.map(item => item + 1);

// 转码后
input.map(function (item) {
  return item + 1;
});
```
上面的原始代码用了箭头函数，Babel 将其转为普通函数，就能在不支持箭头函数的 JavaScript 环境执行了。

下面的命令在项目目录中，安装 Babel。
```sh
$ npm install --save-dev @babel/core
```

## 配置文件`.babelrc`
Babel 的配置文件是`.babelrc`，存放在项目的根目录下。使用 Babel 的第一步，就是配置这个文件。

该文件用来设置转码规则和插件，基本格式如下。
```json
{
  "presets": [],
  "plugins": []
}
```
`presets`字段设定转码规则，官方提供以下的规则集，你可以根据需要安装。

```sh
# 最新转码规则
$ npm install --save-dev @babel/preset-env

# react 转码规则
$ npm install --save-dev @babel/preset-react
```

然后，将这些规则加入`.babelrc`。
```json
  {
    "presets": [
      "@babel/env",
      "@babel/preset-react"
    ],
    "plugins": []
  }
```
注意，以下所有 Babel 工具和模块的使用，都必须先写好`.babelrc`。

## 命令行转码
Babel 提供命令行工具`@babel/cli`，用于命令行转码。

它的安装命令如下。
```sh
$ npm install --save-dev @babel/cli
```

基本用法如下。
```sh
# 转码结果输出到标准输出
$ npx babel example.js

# 转码结果写入一个文件
# --out-file 或 -o 参数指定输出文件
$ npx babel example.js --out-file compiled.js
# 或者
$ npx babel example.js -o compiled.js

# 整个目录转码
# --out-dir 或 -d 参数指定输出目录
$ npx babel src --out-dir lib
# 或者
$ npx babel src -d lib

# -s 参数生成source map文件
$ npx babel src -d lib -s
```

## @babel/register 模块
`@babel/register`模块改写`require`命令，为它加上一个钩子。此后，每当使用`require`加载`.js`、`.jsx`、`.es`和`.es6`后缀名的文件，就会先用 Babel 进行转码。
```sh
$ npm install --save-dev @babel/register
```

使用时，必须首先加载`@babel/register`。
```js
// index.js
require('@babel/register');
require('./es6.js');
```

需要注意的是，`@babel/register`只会对`require`命令加载的文件转码，而不会对当前文件转码。另外，由于它是实时转码，所以只适合在开发环境使用。

## @babel/polyfill 模块
Babel 默认只转换新的 JavaScript 句法（syntax），而不转换新的 API，比如`Iterator`、`Generator`、`Set`、`Map`、`Proxy`、`Reflect`、`Symbol`、`Promise`等全局对象，以及一些定义在全局对象上的方法（比如`Object.assign`）都不会转码。

举例来说，ES6 在`Array`对象上新增了`Array.from`方法。Babel 就不会转码这个方法。如果想让这个方法运行，必须使用`babel-polyfill`，为当前环境提供一个垫片。

安装命令如下。
```sh
$ npm install --save-dev @babel/polyfill
```

然后，在脚本头部，加入如下一行代码。
```js
import '@babel/polyfill';
// 或者
require('@babel/polyfill');
```

Babel 默认不转码的 API 非常多，详细清单可以查看`babel-plugin-transform-runtime`模块的[definitions.js](https://github.com/babel/babel/blob/master/packages/babel-plugin-transform-runtime/src/definitions.js)文件。

## babel API
如果某些代码需要调用 Babel 的 API 进行转码，就要使用`@babel/core`模块。
```js
var babel = require('@babel/core');

// 字符串转码
babel.transform('code();', options);
// => { code, map, ast }

// 文件转码（异步）
babel.transformFile('filename.js', options, function(err, result) {
  result; // => { code, map, ast }
});

// 文件转码（同步）
babel.transformFileSync('filename.js', options);
// => { code, map, ast }

// Babel AST转码
babel.transformFromAst(ast, code, options);
// => { code, map, ast }
```
配置对象`options`，可以参看[官方文档](http://babeljs.io/docs/usage/options/)。

## 集成于 Webpack
除去 `"babel-preset-env"` 我们还需安装 `babel-loader` `babel-core`。其中 `babel-loader@8.x` 及以上版本需要 `babel-core@7.x`，但目前 babel-core 还处于 6.x 版本，所以只能安装 7.x 版本的 babel-loader 。
```sh
$ npm install --save-dev babel-loader@7.x babel-core@6.x babel-preset-env
```
配置过 `.babelrc` 后在 `webpack.config.js` 中配置 loader ：
```js
module: {
  // ...
  rules: [
    { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" }
  ]
  // ...
}
```

## 浏览器环境
Babel 也可以用于浏览器环境，使用[@babel/standalone](https://babeljs.io/docs/en/next/babel-standalone.html)模块提供的浏览器版本，将其插入网页。
```html
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="text/babel">
// Your ES6 code
</script>
```

注意，网页实时将 ES6 代码转为 ES5，**对性能会有影响**。生产环境需要加载已经转码完成的脚本。

Babel 提供一个[REPL 在线编译器](https://babeljs.io/repl/)，可以在线将 ES6 代码转为 ES5 代码。转换后的代码，可以直接作为 ES5 代码插入网页运行。

## 使用 JSX
想要在开发 Vue 时使用 JSX 语法，要想使 Babel 支持 JSX 语法转译需要安装插件 [babel-plugin-transform-vue-jsx](https://github.com/vuejs/babel-plugin-transform-vue-jsx)。

安装：
```sh
npm install\
  babel-plugin-syntax-jsx\
  babel-plugin-transform-vue-jsx\
  babel-helper-vue-jsx-merge-props\
  babel-preset-env\
  --save-dev
```

修改 `.babelrc` 配置文件：
```json
{
  "presets": ["env"],
  "plugins": ["transform-vue-jsx"]
}
```