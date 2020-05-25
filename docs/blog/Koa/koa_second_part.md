# Koa 源码解析（二）

:::tip 提示
本源码解析参考 [Koa v2.11.0](https://github.com/koajs/koa/tree/2.11.0) 版本代码

**原创文章，转载请联系作者[Styx](https://github.com/Styx11)！**
:::

从这里开始我将正式向你介绍 koa 的源码内容，这篇解析重点关注 koa 在**功能上是怎样运行**的，也就是它如何注册并执行中间件、如何使用默认的错误处理，又是如何返回适用于`http.createServer`方法的回调函数来处理请求的，到了下一篇我们再看关于上下文`context`的内容。我会先总览 koa 的入口代码让读者又一个大致印象，再从关键代码开始探究它背后的原理。

我将源码的一些内容做了精简以关注它主要的内容，其中英文注释是源码作者标注的，中文注释是我额外添加的，这样可以帮助你更好地理解代码。

## 总览
一个最基本的 koa 应用会像下面这样：
```js
const Koa = require('koa');
const app = new Koa();

app.use(async ctx => {
  ctx.body = 'Hello';
});
app.listen(8080);
```
用户先通过`new Koa()`初始化一个 koa 对象，然后使用`app.use`注册中间件，最后调用`app.listen`创建服务器并监听请求。得益于它的设计思想，koa 的源码内容主要就围绕着这两个函数展开，简单易懂。

让我们从 koa 的入口开始看看它做了什么，也就是我们调用`new Koa()`时执行的代码，它在 [koa/lib/application.js](https://github.com/koajs/koa/blob/2.11.0/lib/application.js)文件中：
```js
'use strict';

const isGeneratorFunction = require('is-generator-function');
const onFinished = require('on-finished');
const compose = require('koa-compose');
const Emitter = require('events');
const util = require('util');
const Stream = require('stream');
const http = require('http');
const convert = require('koa-convert');

/**
 * Expose `Application` class.
 * Inherits from `Emitter.prototype`.
 */
module.exports = class Application extends Emitter {

  // Initialize a new `Application`.
  constructor(options) {
    super();
    options = options || {};
    //...
    this.env = options.env || process.env.NODE_ENV || 'development';
    this.middleware = [];
    //...
  }

  // Use the given middleware `fn`.
  // Old-style middleware will be converted.
  // 注册中间件，它会转换 generator 风格的函数
  use(fn) {
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
    if (isGeneratorFunction(fn)) {
      //...
      fn = convert(fn);
    }
    this.middleware.push(fn);
    return this;
  }

  // Shorthand for:
  // http.createServer(app.callback()).listen(...)
  listen(...args) {
    const server = http.createServer(this.callback());
    return server.listen(...args);
  }

  // Return a request handler callback
  // for node's native http server.
  callback() {
    // koa-compose 返回一个会从第一个中间件开始执行的函数，我们之后再看它
    const fn = compose(this.middleware);

    // 注册默认的服务端错误处理，error 事件会在中间件运行发生错误时抛出
    if (!this.listenerCount('error')) this.on('error', this.onerror);

    // 返回适用于 http.createServer() 方法的回调函数
    const handleRequest = (req, res) => {
      const ctx = this.createContext(req, res);
      return this.handleRequest(ctx, fn);
    };

    return handleRequest;
  }

  // Initialize a new context.
  createContext(req, res) {
    //...
    // 我将在下篇介绍上下文的具体细节
    // 这里我们只需要知道 createContext 会创建上下文并代理 koa response 和 koa request 对象
  }

  // Default error handler.
  onerror(err) {
    if (!(err instanceof Error)) throw new TypeError(util.format('non-error thrown: %j', err));

    if (404 == err.status || err.expose) return;
    if (this.silent) return;

    const msg = err.stack || err.toString();
    console.error();
    console.error(msg.replace(/^/gm, '  '));
    console.error();
  },

  // Handle request in callback.
  handleRequest(ctx, fnMiddleware) {
    const res = ctx.res;
    res.statusCode = 404;

    // 这里的 ctx.onerror 才是中间件运行期间使用的错误处理函数
    // 它会向客户端返回 404 并向服务端发送 error 事件打印错误
    const onerror = err => ctx.onerror(err);
    const handleResponse = () => respond(ctx);
    onFinished(res, onerror);

    // 这里我们就可以大致看到 koa 的运行流程：
    // 先执行中间件，再调用 respond 返回响应
    return fnMiddleware(ctx).then(handleResponse).catch(onerror);
  }
};

// Response helper.
function respond(ctx) {
  const res = ctx.res;
  let body = ctx.body;
  const code = ctx.status;
  //...

  // status body
  if (null == body) {
    if (ctx.req.httpVersionMajor >= 2) {
      body = String(code);
    } else {
      body = ctx.message || String(code);
    }
    if (!res.headersSent) {
      ctx.type = 'text';
      ctx.length = Buffer.byteLength(body);
    }
    return res.end(body);
  }

  // responses
  // 在 ctx.body 的 setter 中已经设置过例如 context-type 和 context-length 头了
  // 所以这里只是返回响应
  if (Buffer.isBuffer(body)) return res.end(body);
  if ('string' == typeof body) return res.end(body);
  if (body instanceof Stream) return body.pipe(res);

  // body: json
  body = JSON.stringify(body);
  if (!res.headersSent) {
    ctx.length = Buffer.byteLength(body);
  }
  res.end(body);
}
//...
```
在入口代码中我们可以看到 koa 应用的两个主要函数`app.use`和`app.listen`，其中`app.use`函数向`this.middleware`数组中注册中间件，`app.listen`函数是创建服务器并开始监听的语法糖，它最终会在`http.createServer`中调用`app.callback`函数创建服务器。

那么`app.callback`就是整个构造函数的核心内容了，它会返回适用于`http.createServer`方法的回调函数来处理请求，下面来一起分析它的内容。

## app.callback()
我们再从`app.callback`的代码开始看：
```js
// lib/application.js

const compose = require('koa-compose');
//...

module.exports = class Application extends Emitter {
  //...

  // Shorthand for:
  // http.createServer(app.callback()).listen(...)
  listen(...args) {
    const server = http.createServer(this.callback());
    return server.listen(...args);
  }

  // Return a request handler callback
  // for node's native http server.
  callback() {
    // koa-compose 返回一个会从第一个中间件开始执行的函数，我们之后再看它
    const fn = compose(this.middleware);

    // 注册默认的服务端错误处理，error 事件会在中间件运行发生错误时抛出
    if (!this.listenerCount('error')) this.on('error', this.onerror);

    // 返回适用于 http.createServer() 方法的回调函数
    const handleRequest = (req, res) => {
      const ctx = this.createContext(req, res);
      return this.handleRequest(ctx, fn);
    };

    return handleRequest;
  }

  //...
};

```
可以看到`app.callback`函数一共做了三件事：
1. 使用`koa-compose`处理`middleware`数组，返回一个能够执行中间件的函数
2. 监听`error`事件，koa 默认会使用自带的函数在服务端输出错误
3. 返回`handleRequest`函数来执行中间件和处理请求

我们先来看一看`koa-compose`是如何处理中间件数组的，这是 koa 的一个关键技术。

## koa-compose

## handleRequest()


<SourceLink filepath='/Koa/koa_second_part.md' />
<LastEditTime filepath='/Koa/koa_second_part.md' />