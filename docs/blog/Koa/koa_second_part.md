# Koa 源码解析（二）

:::tip 提示
本源码解析参考 [Koa v2.11.0](https://github.com/koajs/koa/tree/2.11.0) 版本代码

**原创文章，转载请联系作者[Styx](https://github.com/Styx11)！**
:::

从这里开始我将正式向你介绍 koa 的源码内容，这篇解析重点关注 koa 在**功能上是怎样运行**的，也就是它如何注册并执行中间件、如何使用默认的错误处理，又是如何返回适用于`http.createServer`方法的回调函数来处理请求，到了下一篇我们再看关于上下文`context`的内容。我会先总览 koa 的入口代码让读者有一个大致印象，再从关键代码开始探究它背后的原理。

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
// koajs/koa/lib/application.js
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

## app.callback
我们再从`app.callback`的代码开始看：
```js
// koajs/koa/lib/application.js

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
koa 目前使用的 koa-compose 版本是`v4.1.0`，他的代码在[koajs/compose/index.js](https://github.com/koajs/compose/blob/4.1.0/index.js)中：
```js
// koajs/compose/index.js
module.exports = compose

/**
 * Compose `middleware` returning
 * a fully valid middleware comprised
 * of all those which are passed.
 */

function compose (middleware) {
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
  }

  // compose 会返回一个中间件签名的函数，意味着它也可作为中间件被多次处理
  return function (context, next) {
    // last called middleware #
    let index = -1
    return dispatch(0)

    // dispatch 会取出序号为 i 的中间件执行
    function dispatch (i) {

      // dispatch 是个闭包，可以使用 index 和 i 做判断是否在一个中间件内调用两次 next
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i

      // 在 v3.1.0 若用户又向 compose 返回的函数传入一个中间件并在其中调用 next 会导致无限循环
      // 所以在这里取且只取一次最后用户传入的中间件可防止无限循环
      // issue#60 https://github.com/koajs/compose/issues/60
      let fn = middleware[i]
      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()
      try {
        // 执行中间件并递归地传入 dispatch 作为它的 next 函数
        // 这就是为什么我们可以让中间件以“类栈”的方式运行
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
```
在 koa-componse 的代码中我们可以看到 koa 中间件的运行原理：koa-compose 接收中间件数组并返回一个拥有中间件签名的函数，这意味着返回的函数也可以作为中间件再一次被包装；这个函数调用一个闭包`dispatch`，这个闭包会从第一个中间件函数开始执行并用`Promise.resolve`包装，运行时它会递归地将自身传入中间件中作为`next`，这也就是为什么我们调用`next`可以去执行下一个中间件，让它们以“类栈”方式运行了。

最终我们得到了一个可以执行中间件数组的函数，它会在`handleRequest`函数响应请求前被执行。`handleRequest`是 koa 用来处理请求的重要部分，下面一起来看看它。

## handleRequest


<SourceLink filepath='/Koa/koa_second_part.md' />
<LastEditTime filepath='/Koa/koa_second_part.md' />