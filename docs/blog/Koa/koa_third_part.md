# Koa 源码解析（三）

:::tip 提示
本源码解析参考 [Koa v2.11.0](https://github.com/koajs/koa/tree/2.11.0) 版本代码

**原创文章，转载请联系作者[Styx](https://github.com/Styx11)！**
:::

在上一篇源码解析中我们了解了 koa 的运行原理，包括中间件的注册运行、服务器的创建和它的响应流程，这些都是 koa 提供的功能上的内容。那么在这篇文章中我们会探讨 koa 在上下文`context`里为用户提供的抽象函数，不同于 express 在原生 node http 模块上“拓展”接口，koa 为我们提供的是高层次的语法糖，它们不仅减轻了用户的负担，同时还显著地提高了开发效率。正如官方文档所说的——`Koa aims to "fix and replace node"`。

由于上下文`context`“代理”了 koa 的`response`和`request`对象，用户通过上下文可以直接访问它们，所以我将按自顶向下的方式介绍它们的代码，从入口`application.js`里创建`context`开始，到上下文内部使用的代理工具，最后才是真正的`response`和`request`提供的语法部分，这样思路会更清晰。

我将源码的一些内容做了精简以关注它主要的内容，其中英文注释是源码作者标注的，中文注释是我额外添加的，这样可以帮助你更好地理解代码。

## createContext
我们先从创建上下文的入口文件看起，因为涉及到错误处理所以还会包含一些功能上的内容，他的代码在[koajs/koa/lib/application.js](https://github.com/koajs/koa/blob/2.11.0/lib/application.js)：
```js
'use strict';
const response = require('./response');
const compose = require('koa-compose');
const context = require('./context');
const request = require('./request');
const Emitter = require('events');
const util = require('util');
const http = require('http');

// Expose `Application` class.
// Inherits from `Emitter.prototype`.
module.exports = class Application extends Emitter {
  
  // Initialize a new `Application`.
  constructor(options) {
    super();
    options = options || {};
    this.env = options.env || process.env.NODE_ENV || 'development';
    this.middleware = [];

    // 这些文件导出的是对象，所以直接引用是可以修改原对象的
    // 使用 Object.create 会创建一个以它们为原型的对象，之后的修改不会涉及到原对象
    this.context = Object.create(context);
    this.request = Object.create(request);
    this.response = Object.create(response);
    //...
  }
  //...

  // Return a request handler callback
  // for node's native http server.
  callback() {
    const fn = compose(this.middleware);

    // 默认错误处理函数只负责在服务端打印错误
    if (!this.listenerCount('error')) this.on('error', this.onerror);

    const handleRequest = (req, res) => {
      const ctx = this.createContext(req, res);
      return this.handleRequest(ctx, fn);
    };

    return handleRequest;
  }

  // Initialize a new context.
  // 初始化上下文，包括原生 res、req 对象的引用
  // 它们会在 koa response、request 提供的函数中被用到
  createContext(req, res) {
    const context = Object.create(this.context);
    const request = context.request = Object.create(this.request);
    const response = context.response = Object.create(this.response);
    context.app = request.app = response.app = this;
    context.req = request.req = response.req = req;
    context.res = request.res = response.res = res;
    request.ctx = response.ctx = context;
    request.response = response;
    response.request = request;
    context.originalUrl = request.originalUrl = req.url;
    context.state = {};
    return context;
  }

  // Handle request in callback.
  handleRequest(ctx, fnMiddleware) {
    const res = ctx.res;
    res.statusCode = 404;

    const onerror = err => ctx.onerror(err);
    const handleResponse = () => respond(ctx);
    //...

    // 中间件运行过程中的错误会被 ctx.onerror 捕获
    // 它会向客户端返回 404 并向应用默认错误处理函数 this.onerror 发出 error 事件打印错误
    return fnMiddleware(ctx).then(handleResponse).catch(onerror);
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
  }
};
//...
```
可以看到入口代码涉及上下文的内容有两点：一是创建上下文`createContext`，二是注册错误处理函数`ctx.onerror`。koa 负责的错误处理主要是做一些善后工作并向客户端返回错误，其中它还会发出事件通知用户在 koa 应用上的`error`监听函数，默认的行为是打印错误信息。`createContext`函数除了创建上下文对象外，还会将原生的 node 对象赋值到 koa 的`response`和`request`上，它们会被用来提供抽象函数。

接下来我们以`context`为入口，看看它是如何代理 koa 对象让用户可以直接访问的。

## context

## node-delegate

## response

## request

<SourceLink filepath='/Koa/koa_third_part.md' />
<LastEditTime filepath='/Koa/koa_third_part.md' />