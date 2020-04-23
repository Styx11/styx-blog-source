# SSR 构建流程（下）

:::tip 提示
使用依赖版本以及样例源码参考 [https://github.com/Styx11/vue-ssr-base](https://github.com/Styx11/vue-ssr-base)

文章所描述的构建场景基于 Koa2 和 Webpack4 并假定读者学习过 Vue SSR [官方文档](https://ssr.vuejs.org/zh/#什么是服务器端渲染-ssr-？)

**原创文章，转载请联系作者[Styx](https://github.com/Styx11)！**
:::

## 前言
通过[中篇](./ssr_second_part.md)的介绍我们将 Vue SSR 应用与 Koa2 服务器结合，并通过组合中间件提供了路由、文件服务功能。我们使用的`renderer`都是通过直接引用打包文件创建的：
```js
// server.js
const { createBundleRenderer } = require('vue-server-renderer');
const clientManifest = require('./dist/vue-ssr-client-manifest.json');
const serverBundle = require('./dist/vue-ssr-bundle.json');
const template = fs.readFileSync('./src/template/index.html', 'utf8');
const renderer = createBundleRenderer(serverBundle, {
  runInNewContext: false,
  clientManifest,
  template
});
```
这是很自然的，但是在开发过程中每次修改`src`目录下的源文件时都要重新调用`npm run build`打包文件并刷新浏览器，这大大降低了我们的开发效率。

那么在这里，我将向你展示如何通过适配 Webpack4 中间件`devMiddleware`和`hotMiddleware`来与现有的 Koa2 服务器整合以提供高效的开发模式。这是我目前踩坑最多的构建过程，因为它不在 Vue SSR 文档的介绍里，要求我们更多地关注整个前端开发生态、查阅它们的源码、参考旧版本库的模式从而找到一个适配方案。

另外在这个过程中我发现了解中间件在源码层面的运行方式是有必要的，所以我额外写了两篇源码解析来总结我所学到的，希望对你有所帮助：[devMiddleware 源码解析](./devMiddleware.md)、[hotMiddleware 源码解析](./hotMiddleware.md)。

## 思路
Vue SSR 官方在[Bundle Renderer 指引](https://ssr.vuejs.org/zh/guide/bundle-renderer.html#使用基本-ssr-的问题)中为我们提供了构建开发模式的思路——读取更新后的`bundle`从而更新`renderer`。这样服务器就能使用新的`renderer`去创建静态标记并发送更新后的打包文件。这个模式之所以成立是因为`createBundleRenderer`可以使用传入的`template`和`clientManifest`自动注入关键资源和数据预取指令。例如当我们使用 Webpack 提供的`chunkhash`作为浏览器缓存策略时，编译文件的名称就会改变，这样自动注入资源就显得额外重要，并且它还提供内置的`source-map`的支持。

那么综上所述，对于服务端，我们需要在两个 Webpack 实例上注册编译钩子获取更新后的`bundle`并重新创建`renderer`；对于客户端，`webpack-dev-middleware`中间件将处理相关请求，为客户端提供更新后的`bundle`文件。

## 准备
现在让我们在原来的样例库中添加一个专门存放[开发模式逻辑](https://github.com/Styx11/vue-ssr-base/blob/master/lib/devMiddleware.js)的文件。因为我们需要监听供“服务端渲染”和“客户端激活”的两组文件，所以我们让它会返回一组`Promise`以便让服务器在一切准备就绪后再开始监听请求：
```js
// lib/devMiddleware.js

module.exports = (app) => {
  let serverRes, clientRes;
  const serverPromise = new Promise(res => serverRes = res);
  const clientPromise = new Promise(res => clientRes = res);

  //... resolve here

  return Promise.all([serverPromise, clientPromise]);
};
```
由于需要监听两组文件，所以我们之后会分别创建针对服务端和客户端的 devMiddleware 并在相关的编译钩子中`resolve`它们。

之后在[服务端](https://github.com/Styx11/vue-ssr-base/blob/master/server.js)引用并**只**在开发模式使用它：
```js
// server.js
//...
const Koa = require('koa')
const isProd = process.env.NODE_ENV === 'production';
const devMiddleware = require('./lib/devMiddleware.js');

//...
const app = new Koa();
const router = //...

router.use(/* ... */)
router.get(/* ... */)

// 最后挂载通配符路由，因为需要让中间件处理特定请求
const listen = () => {
  app.use(route.routes());
  app.use(route.allowedMethods());
  app.listen(8080, () => {
    console.log('Server running at localhost:8080');
  });
};

isProd
  ? listen()
  : devMiddleware(app).then(listen)

```
最后添加开发模式的运行脚本：
```json
// package,json
"script": {
  "dev": "cross-env NODE_ENV=development node server",
  "start": "cross-env NODE_ENV=production node server",
  //...
}
//...
```
`npm run dev`会让服务器在开发模式下运行并使用中间件以提供重载功能。

接下来我们添加这两个中间件的相关代码让这一切运行起来。

## devMiddleware
`webpack-dev-middleware`是`webpack-dev-server`内部使用的中间件，它可以提供更高的灵活性并与现有的服务器结合。先来安装依赖：
```shell
npm install webpack-dev-middleware@3.7.2 --save-dev
```

然后仿照 Express 那样的方式创建两个用于服务端和客户端入口文件的中间件：
```js
// lib/devMiddleware.js
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const clientConfig = require('../config/webpack.client.js');
const serverConfig = require('../config/webpack.server.js');

module.exports = (app) => {
  let serverRes, clientRes;
  const serverPromise = new Promise(res => serverRes = res);
  const clientPromise = new Promise(res => clientRes = res);

  // 目前只是创建并返回中间件
  const createDevMiddleware = (complier, config) => {
    const middleware = webpackDevMiddleware(complier, {
      publicPath: config.output.publicPath,
      noInfo: true
    });

    //... resolve here

    return middleware;
  };

  const clientComplier = webpack(clientConfig);
  const clientDevMiddleware = createDevMiddleware(clientComplier, clientConfig);

  const serverComplier = webpack(serverConfig);
  const serverDevMiddleware = createDevMiddleware(serverComplier, serverConfig);

  // 只是仿照 express 的方式，并不适用与 koa2
  app.use(clientDevMiddleware);
  app.use(serverDevMiddleware);

  return Promise.all([serverPromise, clientPromise]);
};
```
目前这个模式并不适用于我们的 Koa2 服务器，因为通过`middleware`对象的[源码](https://github.com/webpack/webpack-dev-middleware/blob/v3.7.2/lib/middleware.js)我们可以知道 devMiddleware 内部使用的是类 Express API，直接用在服务器上会报错。所以我们做以下适配：
```js
// lib/devMiddleware.js
//...
module.exports = (app) => {
  //...

  const createDevMiddleware = (complier, config) => {
    const middleware = webpackDevMiddleware(complier, {
      publicPath: config.output.publicPath,
      noInfo: true
    });

    // 适配 res 相关的方法
    return async (ctx, next) => {
      // middleware 内部会返回一个 promise
      await middleware(ctx.req, {
        setHeader: (name, header) => {
          return ctx.set(name, header);
        },
        getHeader: name => {
          return ctx.get(name);
        },
        end: content => {
          ctx.body = content
        },
        locals: ctx.state,
      }, next);
    };
  };

  //...
}
```
这个时候在开发模式下我们的服务器就可以在源码变动的时候为客户端提供更新后的打包文件了，这是第一部分。

第二部分就是关键了，我们要为服务端和客户端的 Webpack 实例添加编译钩子获取更新后的`bundle`从而创建新的`render`，这也是`Promise`被`resolve`的时机：
```js
// lib/devMiddleware.js
//...
const fs = require('fs');
const path = require('path');
const { createBundleRenderer } = require('vue-server-renderer');

// 添加 render 相关参数
module.exports = (app, render) => {
  let serverBundle, clientManifest;
  let serverResolve, clientResolve;
  const serverPromise = new Promise(res => serverResolve = res);
  const clientPromise = new Promise(res => clientResolve = res);

  // 因为两端都要注册钩子，所以在这里一块处理
  const createDevMiddleware = (complier, config, side) => {
    //...
    const isClient = side === 'client';

    // 编译完成钩子
    complier.hooks.done.tap('renderer-rebuild', state => {
      stats = stats.toJson();
      stats.errors.forEach(err => console.error(err));
      stats.warnings.forEach(warning => console.warn(warning));
      if (stats.errors.length) return;

      // 根据 side 选择 serverBundle 或 clientManifest 路径
      // 并使用 devMiddleware 默认的 memory-fs 内存文件系统获取编译文件
      const sPath = path.resolve(__dirname, '../dist/vue-ssr-server-bundle.json');
      const cPath = path.resolve(__dirname, '../dist/vue-ssr-client-manifest.json');

      // 和 complier.outputFileSystem 引用同一个文件系统
      middleware.fileSystem.readFileSync(isClient ? cPath : sPath, (err, file) => {
        if (err) throw err;

        // 重新创建 renderer
        // 因为要与服务端共享，所以我们将 renderer 和 template 传入一个 render 全局对象中
        const res = JSON.parse(file.toString());
        isClient ? clientManifest = res : serverBundle = res;
        if (clientManifest && serverBundle) {
          render.renderer = createBundleRenderer(serverBundle, {
            template: render.template,
            clientManifest,
            runInNewContext: false
          });
        }

        isClient ? clientResolve() : serverResolve();
      });
    });
    //...
  };

  //...
}
```
紧接着修改`server.js`在开发模式下创建`renderer`的相关代码：
```js
//server.js
let renderer;
const isProd = process.env.NODE_ENV === 'production';
const devMiddleware = require('./lib/devMiddleware.js');
const template = require('fs').readFileSync('./src/template/index.html', 'utf8');

const render = { renderer, template }
if (isProd) {
  const { createBundleRenderer } = require('vue-server-renderer');
  const serverBundle = require('./dist/vue-ssr-server-bundle.json');
  const clientManifest = require('./dist/vue-ssr-client-manifest.json');
  render.renderer = createBundleRenderer(serverBundle, {
    template: render.template,
    runInNewContext: false,
    clientManifest,
  })
}
//...

router.use(/* ... */)
router.get('*', async ctx => {
  //...
  const context = { title: 'Hello SSR', url: ctx.url };
  try {
    // 修改为 render.renderer
    const html = await render.renderer.renderToString(context);
    //...
    ctx.state.html = html;
  } catch (e) {
    //...
  }
});
//...

isProd
  ? listen()
  : devMiddlware(app, render).then(listen);
```
现在当我们进入开发模式时，`renderer`的创建就交给`lib/devMiddleware.js`中注册的钩子函数了，并且服务器只有在首次编译完成后才会监听请求（等待`Promise`）。

让我们来测试一下目前的开发模式，运行命令`npm run dev`后你可以在终端看到编译信息并且最后会提示`Server running at localhost`表明服务器开始监听：
```shell
...
[./src/App.vue] 1.09 KiB {main} [built]
[./src/app.js] 310 bytes {main} [built]
[./src/client.entry.js] 175 bytes {main} [built]
[./src/router/index.js] 469 bytes {main} [built]
    + 29 hidden modules
ℹ ｢wdm｣: Compiled successfully.
Server running at localhost:8080
```
打开浏览器进入地址`localhost:8080`可以看到我们客户端应用，这个时候我们随便更改一下`src`目录下应用的标签部分并保存，可以在终端看到有新的编译信息输出，同时我们刷新浏览器可以发现内容有所变化。这就是我们在这一部分的目的了——更新内容而无需重新调用编译命令，这让我们的开发变得更加高效。
![](https://s1.ax1x.com/2020/04/22/JNmOcn.gif)

但是这样还不够，我们还是需要手动刷新浏览器并且在这个过程中应用状态会丢失，导致一切都得重新来过。这个时候模块热替换HMR（Hot Module Replacement）就可以让开发效率更上一层楼。