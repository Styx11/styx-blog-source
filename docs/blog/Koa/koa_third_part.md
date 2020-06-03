# Koa 源码解析（三）

:::tip 提示
本源码解析参考 [Koa v2.11.0](https://github.com/koajs/koa/tree/2.11.0) 版本代码

**原创文章，转载请联系作者[Styx](https://github.com/Styx11)！**
:::

在上一篇源码解析中我们了解了 koa 的运行原理，包括中间件的注册运行、服务器的创建和它的响应流程，这些都是 koa 提供的功能上的内容。那么在这篇文章中我们会探讨 koa 在上下文`context`里为用户提供的抽象函数，不同于 express 在原生 node http 模块上“拓展”接口，koa 为我们提供的是高层次的语法糖，它们不仅减轻了用户的负担，同时还显著地提高了开发效率。正如官方文档所说的——`Koa aims to "fix and replace node"`。

由于上下文`context`“代理”了 koa 的`response`和`request`对象，用户通过上下文可以直接访问它们，所以我将按自顶向下的方式介绍它们的代码，从入口`application.js`里创建`context`开始，到上下文内部使用的代理工具，最后才是真正的`response`和`request`提供的语法部分，这样思路会更清晰。

我将源码的一些内容做了精简以关注它主要的内容，其中英文注释是源码作者标注的，中文注释是我额外添加的，这样可以帮助你更好地理解代码。

## createContext
我们先从创建上下文的入口文件看起，因为涉及到错误处理所以还会包含一些功能上的内容，它的代码在[koajs/koa/lib/application.js](https://github.com/koajs/koa/blob/2.11.0/lib/application.js)：
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
可以看到入口代码涉及上下文的内容有两点：一是创建上下文`createContext`，二是注册错误处理函数`ctx.onerror`。koa 负责的错误处理主要是做一些善后工作并向客户端返回错误，其中它还会发出事件通知用户在 koa 应用上的`error`监听函数，默认的行为是打印错误信息。`createContext`函数除了创建上下文对象外，还会将原生的 node 对象赋值到 koa 的`response`和`request`上，它们会被用来提供代理和抽象函数。

接下来我们以`context`为入口，看看它的错误处理和代理是如何工作。

## context
上下文代码在[koajs/koa/lib/context.js](https://github.com/koajs/koa/blob/2.11.0/lib/context.js)：
```js
'use strict';
const util = require('util');
const createError = require('http-errors');
const httpAssert = require('http-assert');
const delegate = require('delegates');
const statuses = require('statuses');
const Cookies = require('cookies');

const COOKIES = Symbol('context#cookies');

// Context prototype.
const proto = module.exports = {
  //...

  // Default error handling.
  // 默认错误处理，这和用户配置的错误处理是不同的
  onerror(err) {
    // don't do anything if there is no error.
    // this allows you to pass `this.onerror`
    // to node-style callbacks.
    if (null == err) return;
    if (!(err instanceof Error)) err = new Error(util.format('non-error thrown: %j', err));

    // 发出 error 事件，在服务端打印错误
    this.app.emit('error', err, this);
    //...

    // 在 application 中设置的原生 node 对象
    const { res } = this;

    // first unset all headers
    // 发生错误，移除所有头部
    if (typeof res.getHeaderNames === 'function') {
      res.getHeaderNames().forEach(name => res.removeHeader(name));
    } else {
      res._headers = {}; // Node < 7.7
    }

    // then set those specified
    // 设置错误信息头部
    this.set(err.headers);

    // force text/plain
    this.type = 'text';

    // ENOENT support
    if ('ENOENT' == err.code) err.status = 404;

    // default to 500
    if ('number' != typeof err.status || !statuses[err.status]) err.status = 500;

    // respond
    // 响应错误信息
    const code = statuses[err.status];
    const msg = err.expose ? err.message : code;
    this.status = err.status;
    this.length = Buffer.byteLength(msg);
    res.end(msg);
  },

  // cookies 相关函数
  get cookies() {
    if (!this[COOKIES]) {
      this[COOKIES] = new Cookies(this.req, this.res, {
        keys: this.app.keys,
        secure: this.request.secure
      });
    }
    return this[COOKIES];
  },

  set cookies(_cookies) {
    this[COOKIES] = _cookies;
  },

  assert: httpAssert,

  throw(...args) {
    throw createError(...args);
  },
};

// Response delegation.
// delegate 将 koa 对象代理到上下文中
// 注意，这里只是传入了目标对象字符串，说明我们需要自己设置具体对象到 proto 上
// 也就是 createContext 设置的 context.response = response
delegate(proto, 'response')
  .method('attachment')
  .method('redirect')
  .method('remove')
  .method('vary')
  .method('has')
  .method('set')
  .method('append')
  .method('flushHeaders')
  .access('status')
  .access('message')
  .access('body')
  .access('length')
  .access('type')
  .access('lastModified')
  .access('etag')
  .getter('headerSent')
  .getter('writable');

// Request delegation.
delegate(proto, 'request')
  .method('acceptsLanguages')
  .method('acceptsEncodings')
  .method('acceptsCharsets')
  .method('accepts')
  .method('get')
  .method('is')
  .access('querystring')
  .access('idempotent')
  .access('socket')
  .access('search')
  .access('method')
  .access('query')
  .access('path')
  .access('url')
  .access('accept')
  .getter('origin')
  .getter('href')
  .getter('subdomains')
  .getter('protocol')
  .getter('host')
  .getter('hostname')
  .getter('URL')
  .getter('header')
  .getter('headers')
  .getter('secure')
  .getter('stale')
  .getter('fresh')
  .getter('ips')
  .getter('ip');
```
可以看到上下文的代码分为两部分：一部分是`context`本身提供的函数，比如错误处理、断言、cookie 等；另一部分就是利用`delegate`代理 koa 的`response`和`request`对象，让用户可以直接通过`context`去访问。

第一部分我们主要看错误处理`ctx.onerror`，它首先会发出`error`事件通知应用在服务端打印错误，然后取出我们在`createContext`中设置的 node 原生对象`res`，在这个对象上`onerror`先会清除之前设置的所有头部，随后设置诸如错误信息头、内容类型、状态码之类的信息，最后向客户端响应一个错误信息。一般来说，koa 默认提供的错误处理是足以应对绝大多数的场景的，这就使得用户编写 web 应用变得更加轻松。

第二部分我们从函数`delegate`开始，看看它是如何让上下文`context`代理 koa 对象的。

## node-delegate
我们看看上下文涉及到的几个 delegate 提供的函数，它的代码在[tj/node-delegate/index.js](https://github.com/tj/node-delegates/blob/master/index.js)：
```js
module.exports = Delegator;

// Initialize a delegator.
function Delegator(proto, target) {
  if (!(this instanceof Delegator)) return new Delegator(proto, target);

  // proto 是代理对象
  this.proto = proto;

  // target 是字符串，我们需要自己将目标对象赋值到 proto 同名属性上
  this.target = target;
  this.methods = [];
  this.getters = [];
  //...
}

// Delegate method `name`.
// 访问 proto[name] 相当于访问 proto[target][name]
// 我们在 createContext 设置过 context.response = response
// 举例来说这里访问 context[name] 等于 context['response'][name]，即 response[name]
Delegator.prototype.method = function(name){
  var proto = this.proto;
  var target = this.target;
  this.methods.push(name);

  proto[name] = function(){
    // 因为使用 function 定义的关系，这里的 this 是运行时指向的对象，也就是 proto
    // 如果是用箭头函数定义的，this 就会指向 delegate 实例
    return this[target][name].apply(this[target], arguments);
  };

  return this;
};

// Delegator accessor `name`.
Delegator.prototype.access = function(name){
  return this.getter(name).setter(name);
};

// Delegator getter `name`.
Delegator.prototype.getter = function(name){
  var proto = this.proto;
  var target = this.target;
  this.getters.push(name);

  // 非标准建议的写法，最好是 defineProperty
  proto.__defineGetter__(name, function(){
    return this[target][name];
  });

  return this;
};

// Delegator setter `name`.
Delegator.prototype.setter = function(name){
  var proto = this.proto;
  var target = this.target;
  this.setters.push(name);

  proto.__defineSetter__(name, function(val){
    return this[target][name] = val;
  });

  return this;
};
```
我们可以看到 node-delegate 并不是直接提供一个代理对象，而是在用户定义的`proto`上设置同名 name 的函数或者 getter、setter，当用户访问`proto[name]`方法或属性时，就会访问到我们提前设置的`proto[target]`对象上，就像前面的`context.response`。有一点需要注意的是 node-delegate 代码最后的更新时间是2016年4月，所以其中的一些写法不同于现在，尤其是用`function`定义的对象方法，其中`this`会指向它运行时的对象也就是`proto`而不是 delegate 实例。

了解了`context`所用的代理工具后我们就可以来看用户真正会访问到的 koa 对象了，由于它们的语法有很多，我只会挑一些平时经常会用到的，比如`response.body`、`request.url`等，你也可以跳跃地看。

## response
koa 的`response`对象代码在[koajs/koa/lib/response.js](https://github.com/koajs/koa/blob/2.11.0/lib/request.js)
```js
'use strict';

const ensureErrorHandler = require('error-inject');
const onFinish = require('on-finished');
const statuses = require('statuses');
const destroy = require('destroy');
const assert = require('assert');
const Stream = require('stream');
//...

module.exports = {
  //...

  // Return response header.
  get header() {
    const { res } = this;
    return typeof res.getHeaders === 'function'
      ? res.getHeaders()
      : res._headers || {}; // Node < 7.7
  },

  // Return response header, alias as response.header
  get headers() {
    return this.header;
  },

  // Get response status code.
  get status() {
    return this.res.statusCode;
  },

  // Set response status code.
  set status(code) {
    if (this.headerSent) return;

    assert(Number.isInteger(code), 'status code must be a number');
    assert(code >= 100 && code <= 999, `invalid status code: ${code}`);

    // 标记位，表示用户手动设置了 status
    this._explicitStatus = true;
    this.res.statusCode = code;
    if (this.req.httpVersionMajor < 2) this.res.statusMessage = statuses[code];
    if (this.body && statuses.empty[code]) this.body = null;
  },

  // Get response status message
  get message() {
    return this.res.statusMessage || statuses[this.status];
  },

  // Set response status message
  set message(msg) {
    this.res.statusMessage = msg;
  },

  // Get response body.
  get body() {
    return this._body;
  },

  // Set response body.
  // 设置响应体 body，它会在 application 的 handleResponse 中返回给客户端
  // 在这里它会额外地设置头信息、状态码等
  set body(val) {
    const original = this._body;
    this._body = val;

    // no content
    if (null == val) {
      if (!statuses.empty[this.status]) this.status = 204;
      this.remove('Content-Type');
      this.remove('Content-Length');
      this.remove('Transfer-Encoding');
      return;
    }

    // set the status
    // 默认设置状态码
    if (!this._explicitStatus) this.status = 200;

    // set the content-type only if not yet set
    // 默认设置内容类型
    const setType = !this.has('Content-Type');

    // string
    if ('string' == typeof val) {
      if (setType) this.type = /^\s*</.test(val) ? 'html' : 'text';
      // 返回内容字符数
      this.length = Buffer.byteLength(val);
      return;
    }

    // buffer
    if (Buffer.isBuffer(val)) {
      if (setType) this.type = 'bin';
      this.length = val.length;
      return;
    }

    // stream
    if ('function' == typeof val.pipe) {
      onFinish(this.res, destroy.bind(null, val));
      ensureErrorHandler(val, err => this.ctx.onerror(err));

      // overwriting
      if (null != original && original != val) this.remove('Content-Length');

      if (setType) this.type = 'bin';
      return;
    }

    // json
    this.remove('Content-Length');
    this.type = 'json';
  },

  //...

  // Return response header.
  // 获取头信息
  get(field) {
    return this.header[field.toLowerCase()] || '';
  },

  // Returns true if the header identified by name is currently set in the outgoing headers.
  // The header name matching is case-insensitive.
  // 返回是否含有指定头信息，它的匹配是非大小写敏感的
  has(field) {
    return typeof this.res.hasHeader === 'function'
      ? this.res.hasHeader(field)
      // Node < 7.7
      : field.toLowerCase() in this.headers;
  },

  // Set header `field` to `val`, or pass
  // an object of header fields.
  // 设置头信息
  set(field, val) {
    if (this.headerSent) return;

    if (2 == arguments.length) {
      if (Array.isArray(val)) val = val.map(v => typeof v === 'string' ? v : String(v));
      else if (typeof val !== 'string') val = String(val);
      this.res.setHeader(field, val);
    } else {
      for (const key in field) {
        this.set(key, field[key]);
      }
    }
  },

  // Append additional header `field` with value `val`.
  append(field, val) {
    const prev = this.get(field);

    if (prev) {
      val = Array.isArray(prev)
        ? prev.concat(val)
        : [prev].concat(val);
    }

    return this.set(field, val);
  },

  // Remove header `field`.
  remove(field) {
    if (this.headerSent) return;

    this.res.removeHeader(field);
  },

  //...
};
```
我挑了一些在`response`对象上经常会用到的函数和属性，头信息相关的有`header`、`set`、`append`和`remove`等，响应体相关的有`body`的 setter、getter 函数、`message`、`status`等。

我们主要看`body`相关的函数，首先当 koa 在`handleResponse`中响应请求时会通过`body`的 getter 函数获取到私有变量`this._body`，也就是用户提供的内容；而当用户通过`ctx.body`设置响应体时，`body`的 setter 函数除了设置`this._body`之外，还会做一些额外的工作，比如设置`status`值、设置内容类型`Content-Type`等，其中`handleResponse`只是返回了`body`，不做额外的操作。

接下来我们来看看 koa 的`request`对象。
## request
`request`相关代码在[koajs/koa/lib/request.js](https://github.com/koajs/koa/blob/2.11.0/lib/request.js)
```js
'use strict';

const qs = require('querystring');
const only = require('only');
//...

module.exports = {

  // Return request header.
  get header() {
    return this.req.headers;
  },

  //...

  // Return request header, alias as request.header
  get headers() {
    return this.req.headers;
  },

  // Get request URL.
  get url() {
    return this.req.url;
  },
  //...

  // Get origin of URL.
  get origin() {
    return `${this.protocol}://${this.host}`;
  },

  // Get full request URL.
  // this.originUrl 在 createContext 中被设置
  get href() {
    // support: `GET http://example.com/foo`
    if (/^https?:\/\//i.test(this.originalUrl)) return this.originalUrl;
    return this.origin + this.originalUrl;
  },

  // Get request method.
  get method() {
    return this.req.method;
  },

  //...

  // Get request pathname.
  get path() {
    return parse(this.req).pathname;
  },

  // Get parsed query-string.
  get query() {
    const str = this.querystring;
    const c = this._querycache = this._querycache || {};
    return c[str] || (c[str] = qs.parse(str));
  },

  //...
};
```
我们并没有必要将所有函数一一列举出来，这里只是展示 koa 是如何在原有的 node 对象上做抽象的，所以读者可以根据需要自行查阅相关代码。

## 总结
那么至此 koa 源码解析系列到此结束，我们从两个方面分析了 koa 这个 web 框架是如何工作的，功能上 koa 是如何执行中间件、如何创建服务器；内容上，koa 的上下文对象`context`如何提供高层次的抽象函数。得益于它的设计思想，koa 的代码结构清晰且内容简洁，非常利于我们学习。这种“低层次”的代码设计也可以应用于我们今后的项目开发中，这会让我们的代码易于维护并且具有极高的可拓展性。

真心希望这三篇源码解析对你有所帮助，如果遇到任何问题你可以在 github 上找到我👉[Styx](https://github.com/Styx11)

<SourceLink filepath='/Koa/koa_third_part.md' />
<LastEditTime filepath='/Koa/koa_third_part.md' />