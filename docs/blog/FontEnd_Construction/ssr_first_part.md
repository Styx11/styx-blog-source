# SSR 构建流程（上）

::: tip 提示
使用依赖版本以及样例源码参考 [https://github.com/Styx11/vue-ssr-base](https://github.com/Styx11/vue-ssr-base)

文章所描述的构建场景基于 Koa2 和 Webpack4

**原创文章，转载请联系作者[Styx](https://github.com/Styx11)！**
:::

## 前言
最近作者接触并学习了 Vue SSR ，即 Vue 应用的服务端渲染。因为服务端渲染开发环境的构建几乎涵盖了前端构建的大部分知识，所以作者觉得有必要对此进行一次完整的总结以应对今后工作的需要。在此之上作者创建了一个 [Repo](https://github.com/Styx11/vue-ssr-base) 作为一个具有普适性的 Vue SSR 项目的基础结构，其中只涉及了一个简单的 Vue 应用示例，重点在于展示所需要的构建配置和一个服务端开发模式，我相信其中对于中间件的适配方法一定会对你有所启发。

我假设读者已经学习过 Vue SSR [官方文档](https://ssr.vuejs.org/zh/#什么是服务器端渲染-ssr-？)，因为在这篇总结中我并不会向你介绍如何去写一个服务端渲染的应用，而是更多地关注文档之外的开发生态。

我将这篇总结拆分成了上中下三部分，上篇关于开始一个 Vue SSR 项目所需的 Webpack 配置，中篇讨论与服务端的集成，下篇重点介绍基于 Koa2 和 Webpack4 的开发模式。

## 开始一个基本的前端项目
目前大部分的前端项目都是基于 Webpack 打包的，Webpack 在这个过程中扮演着“中间人”的角色：它基于 Node 生态，为开发者提供了现代 ECMAScript 的开发能力，将我们所有的依赖文件打包进一个可兼容的 Bundle 文件中，下面我们创建一组最基本的配置文件

**0.** 安装 Webpack4 相关的依赖：
```shell
npm install webpack webpack-cli webpack-merge rimraf cross-env --save-dev
```
我们使用了 `rimraf` 删除过期打包文件，`cross-env` 设置环境变量


**1.** 基于不重复原则(Don't repeat yourself - DRY)，我们保留一个 "common(通用)" 配置：
```js
// config/webpack.base.js
const path = require('path');

// NODE_ENV 可通过 cross-env 设置
const isProd = process.env.NODE_ENV === 'production'
module.exports = {
  mode: isProd
    ? 'production'
    : 'development',
  output: {
    path: path.resolve(__dirname, '../dist'),
    publicPath: '/dist/',
    filename: '[name].[contenthash].js'// hash of chunk content
  },
  devTool: 'source-map',
};
```
其中基于 hash 文件名的浏览器缓存可参考[Webpack 4 如何优雅打包缓存文件](https://imweb.io/topic/5b6f224a3cb5a02f33c013ba)

**2.** 接下来我们基于 `webpack.base.js` 基础配置和 `webpack-merge` 创建客户端的打包配置文件：
```js
// config/webpack.client.js
const path = require('path');
const merge = require('webpack-merge');
const baseConfig = require('./webpack.base.js');

module.exports = merge(baseConfig, {
  name: 'client',
  entry: {
    client: path.resolve(__dirname, '../src/client.entry.js')
  },
});
```

**3.** 最后在 `package.json` 中添加一条打包命令
```json
// package.json
"script": {
  "build": "rimraf dist && cross-env NODE_ENV=production webpack --config config/webpack.client.js"
}
```

以上就是最基本的配置文件了，你可以通过它使用 ES6 的 `import` 语法，并调用 `npm run build` 将所有依赖打包至单一文件中。

## 为 Webpack 附加额外的能力
我们有两个途径赋予 Webpack 额外的处理能力：

1. Loader: Webpack 只能理解 JavaScript 和 JSON 文件。loader 让 Webpack 能够去处理其他类型的文件，并将它们转换为有效模块，以供应用程序使用，以及被添加到依赖图中。

2. Plugin: loader 用于转换某些类型的模块，而插件则可以用于执行范围更广的任务。包括：打包优化，资源管理，注入环境变量等，它应用于整个构建过程。

安装依赖：
```shell
npm install @babel/core @babel/preset-env babel-loader style-loader --save-dev
```

接下来我们在原有的配置中添加它们：
```js
// config/webpack.base.js
//...

module.exports = {
  // ...

  // 原有的插件功能在 Webpack4 的 optimization 选项里直接提供
  optimization: {
    minimize: true,

    // 更改为路径命名规则
    namedModules: true,
    namedChunks: true,

    // 相当于 webpack.DefinePlugins 中设置 'process.env.NODE_ENV: JSON.stringifiy(...)'
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  module: {
    rules: [
      { 
        test: /\.css$/,
        use: [
          'css-loader'
        ]
      }
    ]
  }
};
```
客户端配置：
```js
// config/webpack.client.js
// ...

module.exports = merge(baseConfig, {
  //...

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [ 'babel-loader' ]
      }
    ]
  },

  optimization: {

    // 默认使用 webpack v4+ 提供的全新的通用分块策略
    // 以下注释以 webpack v4 以下版本作对比
    // chunk 相关配置只应用在 client

    // spliteChunks 相当于 CommonsChunkPlugins vendor
    splitChunks: {
      chunks: 'all'
    },

    // runtimeChunks 相当于 CommonsChunkPlugins 中的 'runtime'
    // 这将 runtime chunk 抽离出来公用
    runtimeChunk: {
      name: 'runtime'
    },
  },
});
```

::: warning 注意
在 Webpack4 中原来由 Plugin 提供的功能，例如 `CommonsChunkPlugins` 和 `webpack.DefinePlugins` 等，通过`optimization`相关选项原生提供
具体可参考[Webpack optimization](https://webpack.docschina.org/configuration/optimization/)
:::

通过使用 `babel-loader`和配置`.babelrc`， 我们就能够使用最新的 ES 语法并通过转译使其运行在老版本浏览器中

## 开始一个 Vue SSR 项目
无论是 React 还是 Vue，它们各自的 SSR 都是一种开发方案：试图解决自前后端分离思想出现以来一直存在的问题——首屏载入时间过长。这似乎是一个不可绕开的话题，因为如果想要前后端分离，那么大量的前端资源就要打包进少量的文件中直接发送给客户端，这样首屏载入时间就会成为一个绝对的性能瓶颈。

SSR 方案通过在前后端之间加入了 Node 做中间层，让这个中间层提前渲染好应用程序的“快照”，也就是字符串形式的静态标记发送给用户，之后再发送打包资源并“激活”客户端程序，极大改善了 SEO 和首屏渲染时间，这也是这类方案的中心思想。

Vue SSR 官方文档的一张流程图很好的展示了这一点：
![服务端渲染流程](https://cloud.githubusercontent.com/assets/499550/17607895/786a415a-5fee-11e6-9c11-45a2cfdf085c.png)

那么对于我们来说这就意味着需要两种 Webpack 配置文件：一种以 `server.entry.js` 为入口的服务端配置，另一种以 `client.entry.js` 为入口的客户端配置，以供“服务端渲染”和“客户端激活”。

我们安装 Vue SSR 相关依赖
```shell
npm install vue-template-compiler vue-loader --save-dev
```
其中 `vue-template-compiler` 必须与 `vue` 版本匹配
```shell
npm install vue vue-server-renderer --save
```
我们的代码结构：
```
src
├── components
│   ├── ...
├── App.vue
├── app.js # 通用 entry(universal entry)
├── client.entry.js # 仅运行于浏览器
└── server.entry.js # 仅运行于服务器
```

现在修改 base、client、server 三处配置文件
```js
// config/webpack.base.js
const VueLoaderPlugin = require('vue-loader/lib/plugin-webpack4');
//...

module.exports = {
  //...
  module: {
    rules: [
      { test: /\.vue$/, use: 'vue-loader' },

      // 它会应用到普通的 `.css` 文件
      // 以及 `.vue` 文件中的 `<style>` 块
      // 使用 render template 选项时会提取并注入 css 资源
      { 
        test: /\.css$/,
        use: [
          'vue-style-loader',
          'css-loader'
        ]
      }
    ]
  },
  plugins: [
    // 将你定义过的其它规则复制并应用到 .vue 文件里相应语言的块。
    // 例如，如果你有一条匹配 /\.js$/ 的规则，那么它会应用到 .vue 文件里的 <script> 块。
    new VueLoaderPlugin(),
  ]
};

```

```js
// config/webpack.client.js
// ...
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');

module.exports = merge(baseConfig, {
  //...

  plugins: [
    // 定义vue环境变量
    new webpack.DefinePlugin({
      'process.env.VUE_ENV': '"client"'
    }),

    // 创建客户端清单，以供 createBundleRender 使用
    new VueSSRClientPlugin(),
  ]
});
```
针对 Node 环境的配置，我们会将其打包为 `createBundleRenderer` 使用的`json`文件
```js
// config/webpack.server.js
const path = require('path');
const merge = require('webpack-merge');
const webpack = require('webpack');
const baseConfig = require('./webpack.base');
const nodeExternals = require('webpack-node-externals');
const VueSSRServerPlugin = require('vue-server-renderer/server-plugin');

module.exports = merge(baseConfig, {
  name: 'server',
  target: 'node',
  entry: {
    server: path.resolve(__dirname, '../src/server.entry.js'),
  },
  output: {
    libraryTarget: 'commonjs2'
  },

  // 外置 node 环境依赖
  externals: nodeExternals({
    whitelist: /\.css$/
  }),

  plugins: [
    new webpack.DefinePlugin({
      'process.env.VUE_ENV': '"server"'
    }),

    // 输出json文件
    new VueSSRServerPlugin(),
  ]
});
```
完整的配置参考[https://github.com/Styx11/vue-ssr-base/tree/master/config](https://github.com/Styx11/vue-ssr-base/tree/master/config)

这些配置的使用有以下几个前提：
* 使用 `createBundleRenderer` 创建服务端渲染实例
* 在上一点的前提下以`server.entry.js`为入口使用`VueSSRServerPlugin`插件打包为一个`json`文件
* 在使用 `template` 的前提下使用 `clientManifest` 客户端清单自动注入数据预取指令和资源标签

以上这些都是为最优化的资源注入和更高效的开发模式做基础的。

最后我们添加打包脚本：
```json
// package.json
{
  //...
  "script": {
    "build": "rimraf dist && npm run build:client && npm run build:server",
    "build:client": "cross-env NODE_ENV=production webpack --config config/webpack.client.js",
    "build:server": "cross-env NODE_ENV=production webpack --config config/webpack.server.js"
  }
}
```
执行指令：
```shell
npm run build
```
你就能在`dist`文件夹下看到带有 hash 文件名的服务端客户端打包文件，以及抽离出的公用代码。

我们将在中篇展示如何在服务端使用它们。

## 注意
我们的构建环境基于 Webpack4 ，其中在将`es6`模块打包输出为`commonjs2`模块供服务端使用时，Webpack 会将`es6`模块导出的内容挂载在`module`对象上，而不是像[官方文档](https://ssr.vuejs.org/zh/guide/structure.html#使用-webpack-的源码结构)所描述的覆盖它，在这种情况下`createBundleRenderer`就不能正确的获取到提供的`createApp`函数。

所以我们直接在[`server.entry.js`](https://github.com/Styx11/vue-ssr-demo/blob/master/src/server.entry.js)里使用`commonjs2`模块语法做中间适配以解决不同模块语法的转换问题。

更多请见[To v4 from v3](https://webpack.docschina.org/migrate/4/#import-and-commonjs)迁移指南。

<SourceLink filepath='/FontEnd_Construction/ssr_first_part.md' />