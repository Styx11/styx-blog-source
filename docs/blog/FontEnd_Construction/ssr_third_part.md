# SSR 构建流程（下）

:::tip 提示
使用依赖版本以及样例源码参考 [https://github.com/Styx11/vue-ssr-base](https://github.com/Styx11/vue-ssr-base)

文章所描述的构建场景基于 Koa2 和 Webpack4 并假定读者学习过 Vue SSR [官方文档](https://ssr.vuejs.org/zh/#什么是服务器端渲染-ssr-？)

**原创文章，转载请联系作者[Styx](https://github.com/Styx11)！**
:::

## 前言
在[中篇](./ssr_second_part.md)我们介绍了将 Vue SSR 应用与 Koa2 服务器结合，并通过组合中间件提供了路由、文件服务功能。我们使用的`renderer`都是通过直接引用打包文件创建的：
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
我们都知道开发一个纯客户端应用的时候，可以使用 Webpack 自带的[开发模式](https://webpack.docschina.org/guides/development/#使用-webpack-dev-server)来监听本地文件的变动并实时重载客户端应用。但一个 SSR 项目的开发模式不止是要更新客户端，还包括服务器渲染静态标记所使用的`renderer`的更新，只有这样才可以成功地进行“客户端激活”。所以我们的思路应该是：
1. 将 Webpack 中间件与现有的服务器结合以提供更新客户端应用的能力。

2. 在 Webpack 实例上注册编译钩子读取更新后的`bundle`然后创建`renderer`。这样服务器就能使用新的`renderer`去发送静态标记。

为了做到这些我们可以使用 Webpack 提供的[ Node.js API ](https://webpack.docschina.org/api/node/)和中间件[webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware/tree/v3.7.2)。

## 准备
现在让我们在原来的样例库中添加一个专门存放[开发模式逻辑](https://github.com/Styx11/vue-ssr-base/blob/master/lib/devMiddleware.js)的文件。因为我们需要监听供服务端渲染（`serverBundle`）和客户端激活（`clientManifest`）的两组文件并用它们创建`renderer`，所以我会让它返回一组`Promise`以便服务器在一切准备就绪后开始工作：
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
我们之后会在编译完成钩子中`resolve`它们。

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
这样`npm run dev`就会让服务器在开发模式下运行，接下来我们先在服务器上应用 devMiddleware 中间件，再注册`complier`编译钩子。

## devMiddleware
`webpack-dev-middleware`是`webpack-dev-server`内部使用的中间件，它可以提供更高的灵活性方便与现有的服务器结合。它的工作主要有三个：
1. 开启编译实例`complier`的监听模式，当文件变更时，就会重新执行编译。
2. 设置`complier`和`webpack-dev-middleware`实例的文件系统，这样在使用`MemoryFileSystem`时就能在内存中读取到相同文件。
3. 读取并向客户端提供编译文件——它只会处理对编译文件的请求。

更多的细节可参考我写的[ devMiddleware 源码解析](./devMiddleware.md)。

我们先来安装依赖：
```shell
npm install webpack-dev-middleware@3.7.2 --save-dev
```

然后先仿照 Express 那样的方式创建两个用于服务端和客户端入口文件的中间件：
```js
// lib/devMiddleware.js
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const clientConfig = require('../config/webpack.client.js');
const serverConfig = require('../config/webpack.server.js');

module.exports = (app) => {
  //...
  // 目前只是创建并返回中间件
  const createDevMiddleware = (complier, config) => {
    const middleware = webpackDevMiddleware(complier, {
      publicPath: config.output.publicPath,
      noInfo: true
    });

    return middleware;
  };

  const clientComplier = webpack(clientConfig);
  const clientDevMiddleware = createDevMiddleware(clientComplier, clientConfig);

  // 只是开启服务端 complier 的监听模式，并不需要应用在 app 上
  const serverComplier = webpack(serverConfig);
  createDevMiddleware(serverComplier, serverConfig);

  // 仿照 express 的方式，并不适用与 koa2
  app.use(clientDevMiddleware);

  //...
};
```
有一点需要说明的是创建服务端的 devMiddleware **并不是**让他处理对编译文件的请求（服务端环境的代码肯定也不适用于客户端），只是偷了个懒想让 devMiddleware 为服务端`complier`开启监听模式并设置文件系统，这是我们后面注册编译钩子获取文件的前提。

目前这个`clientDevMiddleware`并不适用于我们的 Koa2 服务器，因为通过 devMiddleware 的[源码](https://github.com/webpack/webpack-dev-middleware/blob/v3.7.2/lib/middleware.js)我们可以知道它内部使用的是类 Express API，直接用在服务器上会报错。所以我们做以下适配：
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
那么现在在开发模式下这两个`complier`就可以进入监听模式，然后在依赖文件变动时重新编译并写入磁盘或内存了。`clientDevMiddleware`也就可以为浏览器提供最新的打包文件。这是第一部分——开启监听模式同时为客户端提供更新后的编译文件，接下来我们看看怎样重新创建`renderer`让服务端可以发送更新后的静态标记。

## doneHook
第二部分就是关键了，我们要为这两个`complier`添加编译钩子获取更新后的`serverBundle`和`clientManifest`从而创建新的`renderer`，这是建立在我们使用`webpack-dev-middleware`开启了它们的监听模式的基础上的，同时也是`Promise`被`resolve`的时机。

Webpack Node.js API 提供的`done`钩子会在每次编译完成时触发，这包括第一次启动开发服务器和依赖文件变动的时候，我们可以利用它去在合适的时机获取编译文件：
```js
// lib/devMiddleware.js
//...
const path = require('path');
const webpack = require('webpack');
const clientConfig = require('../config/webpack.client.js');
const serverConfig = require('../config/webpack.server.js');
const { createBundleRenderer } = require('vue-server-renderer');

// 添加 render 相关参数
module.exports = (app, render) => {
  let serverBundle, clientManifest;
  let serverResolve, clientResolve;
  const serverPromise = new Promise(res => serverResolve = res);
  const clientPromise = new Promise(res => clientResolve = res);

  //...
  const registerDoneHook = (complier, side) => {
    const isClient = side === 'client';
    const sPath = path.resolve(__dirname, '../dist/vue-ssr-server-bundle.json');
    const cPath = path.resolve(__dirname, '../dist/vue-ssr-client-manifest.json');

    // 编译完成钩子
    complier.hooks.done.tap('renderer-rebuild', state => {
      stats = stats.toJson();
      stats.errors.forEach(err => console.error(err));
      stats.warnings.forEach(warning => console.warn(warning));
      if (stats.errors.length) return;
      // complier 和 devMiddleware 引用的是同一个文件系统
      complier.outputFileSystem.readFileSync(isClient ? cPath : sPath, (err, file) => {
        if (err) throw err;
        // 重新创建 renderer
        // 因为要与服务器共享，所以我们会将 renderer 和 template 传入一个 render 全局对象中
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

  const clientComplier = webpack(clientConfig);
  //...
  registerDoneHook(clientComplier, 'client');

  const serverComplier = webpack(serverConfig);
  //...
  registerDoneHook(serverComplier, 'server');

  //...
}
```
我在这里使用了一个全局对象`render`来包含`renderer`、`template`，这样服务器就可以在全局使用或修改它们了

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
打开浏览器进入地址`localhost:8080`可以看到我们客户端应用，这个时候我们随便更改一下`src`目录下应用的标签部分并保存，可以在终端看到有新的编译信息输出，同时我们刷新浏览器可以发现内容有所变化。

![](https://s1.ax1x.com/2020/04/22/JNmOcn.gif)

到这里这个开发模式的基本目的就达到了：不需要重新调用编译命令，服务端和客户端应用就能够进行更新。

但是这样还不够，我们还是需要手动刷新浏览器并且在这个过程中应用状态会丢失，导致一切都得重新来过。这个时候模块热替换 HMR（Hot Module Replacement）就可以让开发效率更上一层楼。

## hotMiddleware
Webpack 提供的 HMR API 可以让我们可以在应用的运行过程中增添、删除和替换模块以实现热重载——我们并不需要刷新浏览器所以应用的状态得以保留。

在应用了`webpack-dev-middleware`的基础上我们依照`webpack-hot-middleware`的[README](https://github.com/webpack-contrib/webpack-hot-middleware/tree/v2.25.0#installation--usage)文档先简单将它添加到我们的应用中：
```js
// lib/devMiddleware.js
const webpack = require('webpack');
const clientConfig = require('../config/webpack.client.js');
const webpackHotMiddleware = require('webpack-hot-middleware');
//...

module.exports = (app, render) => {
  //...

  // hotMiddleware 相关配置
  // hotMiddleware 下不能使用 contentHash、chunkHash
  client.output.filename = '[name].js';
  client.plugins.push(new webpack.HotModuleReplacementPlugin());
  client.entry = ['webpack-hot-middleware/client', client.entry.client];

  //...
  const clientComplier = webpack(clientConfig);
  const clientHotMiddleware = webpackHotMiddleware(clientComplier, { heartbear: 4000 });

  //...

  // 目前这是无法在 Koa2 服务器上使用的
  app.use(clientHotMiddleware);
  
  //...
};
```
让我来对上面的内容做几点说明：首先是 hotMiddleware 下不能使用 Webpack 的`contentHash`或是`chunkHash`命名编译文件；再者由于没有再细分客户端开发和生产环境的 Webpack 配置，所以我选择在这里加入`webpack.HotModuleReplacementPlugin`插件，它为我们提供了 HMR API；最后 hotMiddleware 只能在客户端编译实例上使用，原因是服务端代码只能有一个入口，并且它的代码是需要被打包进客户端代码中运行的。

在 hotMiddleware [源码](https://github.com/webpack-contrib/webpack-hot-middleware/blob/v2.25.0/middleware.js)中可以看到它的工作是基于 SSEs 通信技术的，也就是说 hotMiddleware 需要开启 SSEs 服务以让特定的客户端订阅持续的事件流。但是因为 Koa2 回复请求的主体`ctx.body`默认并不是可写流，所以我们要对它进行如下的适配：
```js
// lib/devMiddleware.js
const { PassThrough } = require('stream');
//...

module.exports = (app, render) => {
  //...

  //...

  // 只能在 write 方法中设置 ctx.body 否则服务器会直接返回一个 unknown 文件
  app.use(async (ctx, next) => {
    const stream = new PassThrough();
    await clientHotMiddleware(ctx.req, {
      end: stream.end.bind(stream),
      write: content => {
        if (!ctx.body) ctx.body = stream;
        return stream.write(content);
      },
      writeHead: (status, header) {
        ctx.status = status;
        ctx.set(header);
      }
    }, next)
  })
};
```
关于适配我有一点需要**特别**说明：因为 hotMiddleware 内部会持续向客户端发送数据（event-stream），所以我设`ctx.body = stream`，且必须在`write`方法内设置，因为我们要先让中间件设置响应头为`text/event-stream`，否则浏览器会直接下载一个 unknown 文件。

那么到这里我们就可以让 hotMiddleware 在 Koa2 下持续写入`eventStream`了。更多关于 hotMiddleware 的内容可以参考我写的[源码解析](./hotMiddleware.md)。

重启服务器`npm run dev`看看模块热替换功能是否运行正常：

![热替换](https://s1.ax1x.com/2020/05/01/JXh8Y9.gif)

一切运行正常！更改代码后无需刷新浏览器应用就能实现更新。

## template
还有一件事，我们创建的`renderer`基于`clientManifest`和`template`，在开发模式下当 Webpack 监听的源文件——以入口文件构建的依赖图中的所有文件发生变化时我们才能够在 Webpack 编译钩子`hooks.done`里重建`renderer`，但是`template`并不在依赖图内，它不被任何源文件所引用，所以它的变动并不会触发编译钩子。我们需要额外地监听`template`文件以在它变动时重新创建`renderer`。

我们选择[chokidar](https://github.com/paulmillr/chokidar)——比 Node.js 原生的`fs.watch / fs.watchFile / FSEvents`更高效的文件监听库。一个简单的例子会像下面这样：
```js
const chokidar = require('chokidar');

const exampleWatcher = chokidar.watch('./example.js');
exampleWatcher.on('change', path => console.log(`File ${path} has been changed`));
```
现在让我把它添加到开发模式下，首先安装依赖`npm install --save-dev chokidar@3.3.1`：
```js
// lib/devMiddleware.js
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { createBundleRenderer } = require('vue-ssr-renderer');
//...

module.exports = (app, render) => {
  let serverBundle, clientManifest;
  //...

  const templatePath = path.resolve(__dirname, '../src/template/index.html');
  const templateWatcher = chokidar.watch(templatePath);
  templateWatcher.on('change', () => {
    template = fs.readFileSync(templatePath, 'utf8');
    render.template = template;
    if (serverBundle && clientManifest) {
      render.renderer = createBundleRenderer(serverBundle, {
        template: render.template,
        runInNewContext: false,
        clientManifest,
      });
    }
    // template is not under webpack's watch so you need to refresh browser by hand
    // and because of browser's cache, you may need to refresh twice when you first open the page
    console.log(`template ${templatePath} has been changed, you need to refresh the browser`);
  });

  //...
}
```
我们重启服务器`npm run dev`，更改`template`的内容然后刷新浏览器就可以看到内容的变化了。

注意：因为`template`不在 Webpack 的监听下，所以它无法使用 hotMiddleware 提供的热重载功能，我们需要手动刷新浏览器才能看到应用更新。

## 总结
那么 SSR 构建流程系列总结至此结束。我们在[上篇](./ssr_first_part.md)介绍了开启一个 Vue SSR 项目所需的 Webpack 配置；在[中篇](./ssr_second_part.md)看到了如何将 Vue SSR 应用与一个 Koa2 服务器结合；在这下篇我们总结了如何创建了一个基于 Koa2 和 Webpack4 的开发环境。在这个过程中我也是收获颇多，比如通过阅读中间件的源码来学习它们的工作原理。

更多的细节你可以参考我的[样例库](https://github.com/Styx11/vue-ssr-base)，同样的，有任何问题你可以在 github 上找到我👉[Styx](https://github.com/Styx11)。

<SourceLink filepath='/FontEnd_Construction/ssr_third_part.md' />