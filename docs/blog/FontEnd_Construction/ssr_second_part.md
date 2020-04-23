# SSR 构建流程（中）

:::tip 提示
使用依赖版本以及样例源码参考 [https://github.com/Styx11/vue-ssr-base](https://github.com/Styx11/vue-ssr-base)

文章所描述的构建场景基于 Koa2 和 Webpack4 并假定读者学习过 Vue SSR [官方文档](https://ssr.vuejs.org/zh/#什么是服务器端渲染-ssr-？)

**原创文章，转载请联系作者[Styx](https://github.com/Styx11)！**
:::

## 前言
在这篇总结中我将介绍 Vue SSR 应用与服务端的集成。希望你了解 Koa2 的基本知识，并且最好有过类似开发经验。

## 一个 Koa2 服务器
Koa2 由 Express 原班人马打造，致力于成为一个更小、更富表现性的 Web 框架，它丢弃了类 Express API，通过组合基于`async`语法的中间件以及对上下文 `ctx` 的处理，避免了层层回调的繁琐，使得编写 Web 应用变得得心应手。

那么一个基本的 Koa2 应用如下所示：
```js
const Koa = require('koa');
const app = new Koa();

app.use(async ctx => {
  ctx.body = 'Hello World';
});

app.listen(8080, () => {
  console.log('Server listening at localhost:8080');
});
```

执行终端命令`node example.js`，你将看到：
```shell
Server listening at localhost:8080
```

## 与 Vue SSR 应用集成
在[上篇](./ssr_first_part.md)中我们已经通过 Webpack 配置打包出了供"服务端渲染"和"客户端激活"的 Bundle 文件，那么我们现在依据这个模式让服务端为我们渲染这些静态标记：
```js
// server.js
const fs = require('fs');
const Koa = require('koa');
const app = new Koa();

// SSR 相关
const { createBundleRenderer } = require('vue-server-renderer');
const clientManifest = require('./dist/vue-ssr-client-manifest.json');
const serverBundle = require('./dist/vue-ssr-bundle.json');
const template = fs.readFileSync('./src/template/index.html', 'utf8');

// renderer 会自动将带有 hash 文件名的js文件引入到 template 中
const renderer = createBundleRenderer(serverBundle, {
  runInNewContext: false,
  clientManifest,
  template
});

app.use(async ctx => {
  const context = { title: 'Hello SSR', url: ctx.url };
  try {
    ctx.body = await renderer.renderToString(context);
  } catch(e) {
    ctx.throw();
  }
});

app.listen(8080, () => {
  console.log('Server listening at localhost:8080');
});
```
打开浏览器的调试窗口，我们可以看到由于使用了`clientManifest`和`template`选项，原来的模版被注入了资源标签和数据预取指令：

![模版](https://s1.ax1x.com/2020/04/13/GX6zfs.png)
虽然我们可以看到预想中的静态标记，但是此时这个页面是“**不可交互**”的，页面中并没有供“客户端激活”的脚本文件，因为我们并不能请求得到相应文件。

Koa2 内部**不绑定**任何额外的中间件，开发者需要自行搭配（个人认为路由应该被纳入 Koa 的基本功能），所以我们自己选择路由中间件和静态文件中间件来让服务器能够提供更多的功能。

## 路由
根据 Vue SSR 文档的介绍，我们会让服务端客户端**共享**路由配置，为了做到这一点我们在服务端创建一个通配符路由将`ctx.url`传入并应用在`vue-router`实例中。

路由中间件我选择的是[@koa/router](https://github.com/koajs/router)，一个基本的路由示例会像下面这样：
```js
const Koa = require('koa');
const Router = require('@koa/router');

const app = new Koa();
const router = new Router();

router.get('/', async ctx => {
  ctx.body = 'Hello Router';
});

// routes 方法返回我们需要的中间件
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(8080);
```
和我们的现有代码结合起来：
```js
// server.js
//...
const Router = require('@koa/router');

//...
const router = new Router();

router.get('*', async ctx => {
  const context = { title: 'Hello SSR', url: ctx.url };
  try {
    ctx.body = await renderer.renderToString(context);
  } catch(e) {
    ctx.throw();
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(8080, () => {
  console.log('Server listening at localhost:8080');
});
```
这样任意的页面请求都会通过通配符路由应用到`vue-router`上去渲染对应组件了。

## 静态文件服务
Koa 并有没 Express 那样原生的静态文件服务`express.static('./dist')`，要实现类似的功能我选择[koa-static-server](https://github.com/pkoretic/koa-static-server)，它在内部使用了低层次的[koa-send](https://github.com/koajs/send)以提供文件服务，我们将它与现有代码结合：
```js
// server.js
//...
const Koa = require('koa');
const Router = require('@koa/router');
const serve = require('koa-static-server');

//...

const app = new Koa();
const router = new Router();

// 开发模式下由 devMiddleware 提供打包文件
// serve will check if request path is allowed with rootPath
router.use('/dist', serve({ rootDir: './dist', rootPath: '/dist' }));

router.get('*', async ctx => {
  const context = { title: 'Hello SSR', url: ctx.url };
  try {
    ctx.body = await renderer.renderToString(context);
  } catch(e) {
    ctx.throw();
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(8080);
```
我们重新启动服务器，打开浏览器的调试窗口点击其中一个`/dist`开头的资源链接可以发现确实通过请求得到了打包文件：

![资源请求](https://s1.ax1x.com/2020/04/14/GxWd1g.png)

这个时候我们的应用变的完全可交互了，它已经被 Vue 在客户端接管。

## 注意
`@koa/router` 所有注册路由的方法都以[path-to-regexp](https://github.com/pillarjs/path-to-regexp)作为模式匹配并且更特定的（specific）路由应该更早注册，但它们之间也存在略微的差别。

例如，`router`实例的所有动词（verb）方法定义的路由普通情况下不能嵌套，而`use`方法定义的路由是可以的，所有嵌套的`url`都可以访问中间件，例如：
```js
// 只接受 url 为 /test1 的 get 请求
router.get('/test1', ...);

// 接受以 /test1 开头的任意嵌套路由，
// 警告！这是不安全的正则表达式，因为它有可能阻塞你的事件循环进程
router.get(/^\/test1(\/[^/]+)*/, ...)

// 接受以 /test2 开头的任意嵌套路由，因为 use 方法内部会将它注册成前缀路由
router.use('/test2', ...)
```
个人认为这样设计的原因是因为动词（verb）方法定义的通常是 API 级别的`url` ，所以需要安全、准确的路由；而`use`方法定义针对一类请求的通用路由，例如文件服务等。

---
那么以上两篇总结就是我们在生产（production）环境下需要的基本的 Webpack4 配置和 Koa2 服务代码了，你可以参照官方文档添加更多自己需要的功能，例如`vue-router`、`vuex`、`micro-cacheing`策略等等，正如我在上篇提到的：这是一个低层次的具有普适性的结构，力求不过多地限制[样例库](https://github.com/Styx11/vue-ssr-base)的使用者。

那么在下篇，将介绍我踩坑最多的开发模式的构建了，我们将借助 Webpack4 提供的中间件以便根据需求进行更多自定义设置让我们的开发更加地高效自然，这也会是这三篇总结的重点。