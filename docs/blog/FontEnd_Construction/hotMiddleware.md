# hotMiddleware 源码解析

:::tip 提示
文章所描述的构建场景基于 Koa2 和 Webpack4

使用依赖版本以及样例源码参考 [https://github.com/Styx11/vue-ssr-base](https://github.com/Styx11/vue-ssr-base)

**原创文章，转载请联系作者[Styx](https://github.com/Styx11)！**
:::

## 前言
这篇解析依然衍生于我的 [SSR 构建流程](./ssr_third_part.md)总结，我认为了解 hotMiddleware 中间件为我们所做的工作对于理解它所使用的通信方式是有帮助的，这其中涉及了 Server-sent Events（SSEs）——一种高效的单向通信技术。在这篇文章中我使用[webpack-hot-middlewarev2.25.0](https://github.com/webpack-contrib/webpack-hot-middleware/tree/v2.25.0)版本源码并做精简以向你展示这一过程，希望对你在服务端事件技术上有所启发。

注意：英文注释是源码作者标注的，中文注释是我额外添加的，这些可以帮助你更好地理解代码

## 这是什么？
在[下篇](./ssr_third_part.md#devMiddleware)中我们使用了 devMiddleware 帮助我们重新构建 `renderer` 并向客户端提供新的编译文件以提高开发效率。但这个模式还有一些缺点：我们仍需刷新浏览器去请求新的编译文件，在这个过程中应用的上下文也会丢失，这依然会妨碍我们的开发。

模块热替换 HMR（Hot Module Replacement）功能可以在应用的运行过程中，增添、删除和替换模块，实现了应用程序的更新但不需要刷新浏览器，从而保留了应用的状态大大提高了开发效率。

我们先从安装依赖来看看一个普通的例子是如何开始的：

0. 安装依赖：
```shell
npm install webpack-hot-middleware@2.25.0 --save-dev
```

1. 在 Webpack 配置文件中加入相关插件，它让我们可以使用 [HMR API](https://webpack.docschina.org/api/hot-module-replacement/)：
```js
// lib/webpack.base.js
const webpack = require('webpack');

module.exports = {
  //...

  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    //...
  ]
}
```

2. 将`webpack-hot-middleware/client`加入客户端 Webpack 配置的入口配置（`entry`）数组中，它的作用我们之后会看到。

3. 加入`webpack-dev-middleware`中间件，这当然是必须的，因为它为浏览器提供了编译文件：
```js
const webpack = require('webpack');
const webpackConfig = require('./webpack.config');
const compiler = webpack(webpackConfig);

app.use(require("webpack-dev-middleware")(compiler, {
    noInfo: true, publicPath: webpackConfig.output.publicPath
}));
```

4. 最后将`webpack-hot-middleware`加入我们的服务端应用：
```js
app.use(require('webpack-hot-middleware')(complier));
```
这就是我们在一个普通应用中需要做的，这个时候照常启动服务器然后尝试修改相关的客户端代码，我们就可以看到在没有刷新的情况下应用程序发生了变化，和手动刷新浏览器的效果一样。

## 它是如何工作的
让我们来看看 hotMiddleware 的 [README](https://github.com/webpack-contrib/webpack-hot-middleware/tree/v2.25.0#how-it-works) 是如何解释它的工作原理的：

> The middleware installs itself as a webpack plugin, and **listens** for compiler events. Each connected client gets a **Server Sent Events** connection, the server will **publish** notifications to connected clients on compiler events. When the client receives a message, it will **check** to see if the local code is up to date. If it isn't up to date, it will **trigger** webpack hot module reloading.

我们可以通过上面的说明将 hotMiddleware 的工作原理进行以下划分：首先在服务端，它作为中间件以`Content-Type: text/event-stream`头回复、处理请求，这会开启 Server Sent Events（SSEs）服务，然后注册 Webpack 的编译钩子以便在文件变动时向客户端发送通知（notifications）；接着在客户端，它初始一个`EventSource`对象订阅这个 SSEs 服务，并在服务端有事件通知发出时调用 HMR API 进行检查并更新模块。

但是，这就有点神奇了！hotMiddleware 是怎么做到既在服务端作为中间件，又在客户端监听事件的呢？这和我们平时使用的中间件是截然不同的，下面我先介绍让这一切能够发生的 SSEs 技术

## Server-sent Events
我们在生活中经常会遇到诸如消息动态实时更新的场景，在早些时候要实现类似这样服务端事件同步更新到客户端的操作，通常会选择“长轮询”（Long polling），也就是由客户端发起一个请求，查询服务端是否有新的事件发生，有则返回，无则由服务端挂起（hanging）这个请求直到发生事件然后返回给客户端。但是这是一种“hack”级别的方法，它不是技术上的一种标准并且也只是结果上实现了事件”同步“，这就意味着无论如何它都不会特别高效，离真正的事件同步有一定的距离。

Server-sent Events（SSEs）技术从底层就被设计为一个高效且节省资源的单向同步技术，它基于现有的 HTTP 协议，这意味着我们无需从头创建一个基于像 WebSocket 协议那样的服务器。在服务端，我们以`Content-Type: text/event-stream`头部开启一个 SSEs 服务并可以在任何时候通过发送符合标准的格式化数据向客户端更新事件（event）；在客户端，我们创建一个`EventSource`对象以订阅（subscribe）这个 SSEs 服务并添加回调函数从而实时地处理相应事件。

一个 SSEs 的简单例子：
```js
// server.js
//...
const app = new Koa();
const router = new Router();
const { PassThrough } = require('stream');

router.get('/event-test', async ctx => {
  const stream = new PassThrough();
  ctx.set('Content-Type', 'text/event-stream');
  ctx.body = stream;
  setInterval(() => {
    // 一次事件以 \n\n 为结束标识
    stream.write('data: hello\n\n');
  }, 1000);
});
app.use(router.routes());
app.use(router.allowedMethods());
app.listen(8080);
```
在客户端我们订阅这个 SSEs 服务：
```js
//client.js
//...
// 注意只能是在同一域名下订阅 SSEs 服务，否则会有跨域请求问题
const event = new EventSource('/event-test');
event.onmessage((e) => {
  console.log(e.data)// hello
});
event.onerror((e) => {
  event.close();
});
```
在上面的例子中，服务端每 1 秒会发出一次事件以模拟实时消息，在客户端我们创建了一个`EventSource`对象去订阅这个服务，这样每次服务端发出通知时我们的回调函数就会被调用。

更多关于 SSEs 的内容可以参考 [Stream Updates with Server-Sent Events](https://www.html5rocks.com/en/tutorials/eventsource/basics/)，虽然这是一篇英文文章但作者以一种浅显易懂的方式介绍了这个技术。

