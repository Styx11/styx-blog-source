# devMiddleware 源码解析

:::tip 提示
文章所描述的构建场景基于 Koa2 和 Webpack4

使用依赖版本以及样例源码参考 [https://github.com/Styx11/vue-ssr-base](https://github.com/Styx11/vue-ssr-base)

**原创文章，转载请联系作者[Styx](https://github.com/Styx11)！**
:::

## 前言
这篇源码分析我本来是作为 [Vue SSR 的构建流程](./ssr_third_part.md)顺带介绍的，但是写着写着突然发现需要解释的东西还是挺多的已经超出了原来的计划，所以我决定另出一篇解析来总结在阅读源码的过程中我所学到的。希望这篇文章可以帮助你理解 Webpack 和中间件`webpack-dev-middleware`是如何相互协调工作的:)

注意：英文注释是源码作者标注的，中文注释是我额外添加的，这些可以帮助你更好地理解代码

## 这是什么？

Webpack 提供了几种可选的模式帮助我们在源码变更后自动编译，而不是每次手动调用`npm run build`。
1. webpack watch mode(webpack 观察模式)
2. webpack-dev-server
3. webpack-dev-middleware

在普通的开发过程中最常用的就是`webpack-dev-server`了，但它提供默认的服务器无法与现有的服务端代码结合，那么这个时候我们就要使用`webpack-dev-middleware`进行定制，并决定在源码更新时应该做哪些事情，这也是`webpack-dev-server`内部使用的中间件。

下面是将`webpack-dev-middleware`和一个`express`服务器结合的简单例子（中间件内部使用类 Express API）：
```js
const express = require('express');
const webpack = require('webpack');
const config = require('webpack.example.js');
const webpackDevMiddleware = require('webpack-dev-middleware');

const app = new express();
const complier = webpack(config);
const middleware = webpackDevMiddleware(complier, {
  publicPath: config.output.publicPath
});

app.use(middleware)；
app.listen(8080);
```
我们运行这个文件将服务器在根路径启动可以在终端看到以下信息：
```shell
...
          Asset       Size  Chunks                    Chunk Names
  app.bundle.js    1.44 MB    0, 1  [emitted]  [big]  app
print.bundle.js    6.57 kB       1  [emitted]         print
     index.html  306 bytes          [emitted]
...
```
在浏览器中打开`loalhost:8080`，然后输入以`publicPath`开头的你在`output.filename`定义的文件名`url`，就能看到打包的文件内容了。例如[中篇](./ssr_second_part.md#静态文件服务)的例子：

![资源请求](https://s1.ax1x.com/2020/04/14/GxWd1g.png)
这也是`webpack-dev-middleware`的**主要**工作——通过服务器提供编译后的打包文件。

那么这个“devMiddleware”是如何做到这些的？它是如何改变`complier`的行为（开启监听模式、检查文件是否该被写入磁盘）、如何响应文件请求，又是为什么无法直接与一个 Koa2 服务器直接结合？在这篇总结中我将向你展示在源码层面这一切是如何进行的。

我们参考[webpack-dev-middleware v3.7.2](https://github.com/webpack/webpack-dev-middleware/tree/v3.7.2)的源码并做以精简，以便快速地展示这一过程。

## 它做了什么？
我们从[webpack-dev-middleware/index.js](https://github.com/webpack/webpack-dev-middleware/blob/v3.7.2/index.js)入口文件开始，看看它主要做了哪些工作：
```js
//...
const createContext = require('./lib/context');
const middleware = require('./lib/middleware');
const { setFs, toDisk } = require('./lib/fs');

// middleware 函数默认参数
const defaults = {
  //...
  stats: {
    context: process.cwd(),
  },
  writeToDisk: false,
};

module.exports = function wdm(compiler, opts) {
  const options = Object.assign({}, defaults, opts);
  const context = createContext(compiler, options);
  //...

  // 开启 complier 的监听模式自动编译变更的源文件
  // 这样每次有文件请求，middleware 都会尝试去读取这些编译文件
  if (!options.lazy) {
    context.watching = compiler.watch(options.watchOptions, (err) => {
      //...
    });
  } else {
    //...
  }

  // 传入的 writeToDisk 属性可以是一个 filter 函数
  // 在 complier 相关钩子中注册函数以检查是否应该写入
  if (options.writeToDisk) {
    toDisk(context);
  }

  // 设置用于读取文件的fs，由于 complier.outputFileSystem 是可自定义的
  // 所以这一步会检查它并设置中间件内部的 context.fs，再通过 middleware.fileSystem 向用户暴露
  // 若用户未定义，则将它们设置为 MemoryFileSystem 的实例
  // 注意，无论那种情况它们引用的都是同一个fs，这样才能在使用 MemoryFileSystem 的情况下读取到相同的文件
  setFs(context, compiler);

  // 返回配置过的 middleware 实例
  return Object.assign(middleware(context), {
    // close 钩子，关闭监听模式
    close(callback) {
      callback = callback || () => {};
      if (context.watching) {
        context.watching.close(callback);
      } else {
        //...
      }
    },

    context,

    // 向外暴露给用户访问文件，和 complier.outputFileSystem 引用同一个fs。
    fileSystem: context.fs,
    //...
  });
};
```
总结一下以上代码的内容，`devMiddleware`主要做了三项工作：开启`complier`的监听模式、处理文件系统的相关任务、返回中间件。因为`toDisk`和`setFs`在一个文件中，所以我将它们放在一起介绍。

我们先来看看关于文件系统[webpack-dev-middleware/lib/fs.js](https://github.com/webpack/webpack-dev-middleware/blob/v3.7.2/lib/fs.js)的代码。

第一部分：如果用户选择将编译文件写入磁盘，也就是传入`writeToDisk`参数，那么`toDisk`函数会在`complier`实例上注册钩子函数，并使用`writeToDisk`作为 filter 判断是否写入
```js
// lib/fs.js
//...
module.exports = {
  // 写入磁盘相关函数
  toDisk(context) {
    //...
    // 编译内容写入到 output 之前的钩子
    compiler.hooks.emit.tap('WebpackDevMiddleware', (compilation) => {
      // ...
      // 资源写入时钩子
      compiler.hooks.assetEmitted.tapAsync(
        'WebpackDevMiddleware',
        (file, info, callback) => {
          // ...
          let { targetPath, content } = info;

          // 获取 filter 函数
          const { writeToDisk: filter } = context.options;
          const allowWrite =
            filter && typeof filter === 'function'
              ? filter(targetPath)
              : true;

          // 若检查失败则取消写入
          if (!allowWrite) {
            return callback();
          }
          // 将资源覆盖写入磁盘
          const dir = path.dirname(targetPath);
          return mkdirp(dir, (mkdirpError) => {
            //...
            return fs.writeFile(targetPath, content, (writeFileError) => {
              //...
              return callback();
            });
          });
        }
      );
    });
  },
};
```
第二部分：处理文件系统，中间件使用`setFs`函数让`complier`和`middleware`引用同一个文件系统，并设置内部使用的`context.fs`，这也就是为什么即使访问不同的对象，我们也可以通过它们的文件系统读取到相同的编译文件（`complier.outputFileSystem`和`middleware.fileSystem`）。
```js
// lib/fs.js
//...
module.exports = {
  //...
  // 设置文件系统
  setFs(context, compiler) {
    //...
    let fileSystem;

    // 检查用户是否已经配置了文件系统
    const isConfiguredFs = context.options.fs;
    const isMemoryFs =
      !isConfiguredFs &&
      !compiler.compilers &&
      compiler.outputFileSystem instanceof MemoryFileSystem;

    if (isConfiguredFs) {
      // 使用用户自定义的文件系统
      const { fs } = context.options;
      //...
      compiler.outputFileSystem = fs;
      fileSystem = fs;
    } else if (isMemoryFs) {
      // 已经设置为 MFS
      fileSystem = compiler.outputFileSystem;
    } else {
      // 否则默认将它们设为 MFS
      fileSystem = new MemoryFileSystem();
      compiler.outputFileSystem = fileSystem;
    }

    // 最后 context.fs、middleware.fileSystem、complier.outputFileSystem 引用的是同一个fs
    context.fs = fileSystem;
  },
}
```
如果不这么做，在使用`MemoryFileSystem`的情况下各个实例会将文件读取到各自的内存块中，不同实例之间无法互通文件，我们的中间件也就无法为我们提供编译文件了。

之后就是关键部分了，让我们来看看最后返回的`middleware`对象内部发生了什么。

## 这一切是如何发生的
这一切是如何运作的呢？devMiddleware 如何处理进来的请求、什么时候读取编译文件？我们从`middleware`对象的[入口文件](https://github.com/webpack/webpack-dev-middleware/blob/v3.7.2/lib/middleware.js)看起：
```js
// lib/middleware.js
const mime = require('mime');
const {
  getFilenameFromUrl,
  handleRequest,
  ready,
} = require('./util');

module.exports = function wrapper(context) {
  return function middleware(req, res, next) {
    res.locals = res.locals || {};

    // 在合适的时机调用 next() 移交控制权
    function goNext() {
      return new Promise((resolve) => {
        ready(context, () => {
          res.locals.webpackStats = context.webpackStats;
          res.locals.fs = context.fs;
          resolve(next());
        }, req);
      });
    }

    //...
    let filename = getFilenameFromUrl(
      context.options.publicPath,
      context.compiler,
      req.url
    );

    // 若这个并不是文件请求，goNext 移交控制权
    if (filename === false) {
      return goNext();
    }

    // middleware 主体
    return new Promise((resolve) => {
      // 在适当的时机调用 processRequest 处理请求
      handleRequest(context, filename, processRequest, req);

      function processRequest() {
        let stat = context.fs.statSync(filename);

        // 若无法找到请求文件，调用 goNext
        if (!stat.isFile()) {
          resolve(goNext());
        }
        //...

        // 读取请求文件
        let content = context.fs.readFileSync(filename);
        let contentType = mime.getType(filename) || '';
        
        //...
        if (!res.getHeader || !res.getHeader('Content-Type')) {
          res.setHeader('Content-Type', contentType);
        }
        res.setHeader('Content-Length', content.length);

        //...
        // Express automatically sets the statusCode to 200, but not all servers do (Koa).
        res.statusCode = res.statusCode || 200;
        if (res.send) {
          res.send(content);
        } else {
          res.end(content);
        }
        
        // 最终 resolve 请求
        resolve();
      }
    });
  };
};
```

通过上述代码我们可以看到，中间件在内部默认调用了类 Express API 去处理请求而不是 Koa2，并且有一点特别突出：devMiddleware **仅仅**处理打包文件的请求。

同时不论是`goNext`移交控制权还是使用`handleRequest`处理请求，中间件都不会立即调用相关函数而是返回一个`Promise`等待结果，我们进入`handleRequest`函数内部可以看到它和`goNext`一样调用了`ready(processRequest)`，也就是说它们都将真正的处理函数传入了`ready`函数内等待合适的时机执行。

让我们来看看`ready`函数做了什么：
```js
// lib/util.js
//...
function ready(context, fn, req) {
  // true 则立即调用 fn
  if (context.state) {
    return fn(context.webpackStats);
  }

  // 否则存入 context.callbacks 中 “wait until bundle finished” 调用
  context.log.info(`wait until bundle finished: ${req.url || fn.name}`);
  context.callbacks.push(fn);
}
//...
```
`ready`检查`context.state`的值，决定是立即执行`fn`，比如之前的`processRequest`，还是暂存入`context.callbacks`中。

源码提示我们当`bundle`准备好，`context.state`为`true`时，`callbacks`中的回调函数才会被调用，在最开始的入口文件可以找到创建这个全局上下文`context`的代码：
```js
//index.js
const createContext = require('./lib/context');
//...

module.exports = function wdm(compiler, opts) {
  const options = Object.assign({}, defaults, opts);
  const context = createContext(compiler, options);

  //...
}
```

然后在[webpack-dev-middleware/lib/context.js](https://github.com/webpack/webpack-dev-middleware/blob/v3.7.2/lib/context.js)的源码中就能找到这个**真正**驱动整个中间件运作的关键——注册`complier`钩子，从而在合适的时间做合适的操作。
```js
// lib/context.js
module.exports = function ctx(compiler, options) {
  const context = {
    state: false,
    callbacks: [],
    compiler,
    //...
  };

  // 编译完成钩子函数
  function done(stats) {
    // We are now on valid state
    context.state = true;
    context.webpackStats = stats;

    // Do the stuff in nextTick, because bundle may be invalidated
    // if a change happened while compiling
    process.nextTick(() => {
      // check if still in valid state
      if (!context.state) {
        return;
      }
      // execute callback that are delayed
      const cbs = context.callbacks;
      context.callbacks = [];
      cbs.forEach((cb) => {
        cb(stats);
      });
    });

    //...
  }

  // 编译无效钩子函数
  function invalid(callback) {
    //...
    // We are now in invalid state
    context.state = false;
    if (typeof callback === 'function') {
      callback();
    }
  }
  //...
  
  // 注册 complier 钩子
  context.compiler.hooks.invalid.tap('WebpackDevMiddleware', invalid);
  context.compiler.hooks.run.tap('WebpackDevMiddleware', invalid);
  context.compiler.hooks.done.tap('WebpackDevMiddleware', done);
  context.compiler.hooks.watchRun.tap(
    'WebpackDevMiddleware',
    (comp, callback) => {
      invalid(callback);
    }
  );

  return context;
};
```
`middleware`注册了 Webpack 实例`complier`的编译钩子，在不同阶段中设置`context.state`的值以决定是否执行处理函数。

那么到此整个中间件的运作过程可以简述如下：
1. 注册`complier`钩子和一个全局属性`context.state`，从而控制`middleware`处理请求
2. 第一次或重新编译时，在`invalid`函数中设`context.state`为`false`，`middleware`就将请求的处理函数存入`callbacks`等待处理（返回一个`Promise`）
3. 编译完成后在`done`函数中设`context.state`为`true`，`middleware`执行`callbacks`中的处理函数并且之后的请求都会被立即处理
4. `middleware`要么处理一个编译文件的请求，要么`goNext`移交控制权。

## 写在最后
`webpack-dev-middleware`借助 `complier` 提供的编译钩子修改全局上下文`context`从而驱动自身的运作，这是它们之间的联系；在这个过程里中间件开启 Webpack 监听模式（watch mode）并修改双方存取编译文件的 fs（`complier.outputFileSystem`和`middleware.fileSystem`）使得它们可以在一致的内存块中工作，这是相互协调。如果我们需要在一个 Koa2 服务器上添加这个中间件，根据上面的介绍可以很容易的针对它使用的类 Express API 做适配，就像我的[样例库](https://github.com/Styx11/vue-ssr-base/blob/master/lib/devMiddleware.js#L36)展示的那样。

以上就是这篇源码解析的全部内容了，真心希望这对你有所帮助，如果遇到任何问题你可以在 github 上找到我👉[Styx](https://github.com/Styx11)

<SourceLink filepath='/FontEnd_Construction/devMiddleware.md' />