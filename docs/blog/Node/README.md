# util 实用工具
`util` 模块主要用于支持 Node.js 内部 API 的需求。 大部分实用工具也可用于应用程序与模块开发者。 使用方法如下：
```js
const util = require('util);
```

## util.format(format[, ...args])
* `format` \<string\> 一个类似 `printf` 的格式字符串。
`util.format()` 方法返回一个格式化后的字符串，使用第一个参数作为一个类似 `printf` 的格式。

第一个参数是一个字符串，包含零个或多个占位符。 每个占位符会被对应参数转换后的值所替换。 支持的占位符有：

* `%s` - 字符串。
* `%d` - 数值（整数或浮点数）。
* `%i` - Integer.
* `%f` - Floating point value.
* `%j` - JSON。如果参数包含循环引用，则用字符串 '[Circular]' 替换。
* `%o` - Object. A string representation of an object with generic JavaScript object formatting. Similar to util.inspect() with options { showHidden: true, depth: 4, showProxy: true }. This will show the full object including non-enumerable symbols and properties.
* `%O` - Object. A string representation of an object with generic JavaScript object formatting. Similar to util.inspect() without options. This will show the full object not including non-enumerable symbols and properties.
* `%%`- 单个百分号（'`%`'）。不消耗参数。

如果占位符没有对应的参数，则占位符不被替换。
```js
util.format('%s:%s', 'foo');
// 'foo:%s'
```

如果传入 `util.format()` 方法的参数比占位符的数量多，则多出的参数会被强制转换为字符串，然后拼接到返回的字符串，参数之间用一个空格分隔。
```js
util.format('%s:%s', 'foo', 'bar', 'baz');
// 'foo:bar baz'
```

如果第一个参数不是一个字符串，则 `util.format()` 返回一个所有参数用空格分隔并连在一起的字符串。 每个参数都使用 `util.inspect()` 转换为一个字符串。
```js
util.format(1, 2, 3);
// '1 2 3'
```

如果只传入格式字符串，则将该字符串返回，不做任何格式化。
```js
util.format('%% %s'); // '%% %s'
```

## util.callbackify(original)
* `original` \<Function\>  `async` 异步函数或一个返回 Promise 对象的函数

* Returns: \<Function\> 传统回调函数

将 `async` 异步函数(或者一个返回值为 Promise 的函数)转换成**遵循异常优先的回调风格的函数**，例如将 `(err, value) => ...` 回调作为最后一个参数。在回调函数中, 第一个参数 `err` 为 Promise rejected 的原因 (如果 Promise 状态为 resolved , err为 `null` ),第二个参数则是 Promise 状态为 resolved 时的返回值.

例如 :
```js
const util = require('util');

const promise = new Promise((resolve, reject) => {
  resolve('Hello!');
});
const returnPromise = () => promise;
const callbackify = util.callbackify(returnPromise);

callbackify((err, value) => {
  if (err) console.error(err);
  console.log(value);
})
// Hello

// 等价于
// promise.then(value => {
//   console.log(value);
// }).catch(err => {
//   console.error(err);
// });
```

注意:

* 回调函数是异步执行的, 并且有异常堆栈错误追踪. 如果回调函数抛出一个异常, 进程会触发一个 [uncaughtException](http://nodejs.cn/api/process.html#process_event_uncaughtexception) 异常, 如果没有被捕获, 进程将会退出.

* `null` 在回调函数中作为一个参数有其特殊的意义, 如果回调函数的首个参数为 Promise rejected 的原因且带有返回值, 且值可以转换成布尔值 `false`, 这个值会被封装在 Error 对象里, 可以通过属性 `reason` 获取.

```js
const fn = () => Promise.reject(null);
const callbackFunction = util.callbackify(fn);

callbackFunction((err, value) => {
  // When the Promise was rejected with `null` it is wrapped with an Error and
  // the original value is stored in `reason`.
  err && err.hasOwnProperty('reason') && err.reason === null;  // true
});
```

## util.promisify(original)
新增于: v8.0.0
* `original` \<Function\>
* Returns: \<Function\>
让一个遵循异常优先的回调风格的函数， 即 `(err, value) => ...` 回调函数是最后一个参数, 返回一个返回值是一个 `promise` 版本的函数。

例如：
```js
const util = require('util');
const fs = require('fs');

const readFilePromisily = util.promisify(fs.readFile);

readFilePromisily('./test.txt').then(value => {
  console.log(value.toString());
}).catch(err => {
  console.error(err);
});

// 等价于
// fs.readFile('./test.txt', (err, value) => {
//   if (err) throw err;
//   console.log(value.toString());
// })
```

下面是 `promisify()` 的一个简单实现：
```js
const fs = require('fs');

// 返回一个函数，该函数返回一个包含异步函数结果的 Promise 对象
const promisify = targetFn => {
  return (...args) => {
    const promise = new Promise((resolve, reject) => {
      targetFn(...args, (err, value) => {
        if (err) return reject(err);
        resolve(value);
      })
    });
    return promise;
  };
};

const readFilePromisily = promisify(fs.readFile);

readFilePromisily('./test.txt', 'utf8').then(value => {
  console.log(value);
}).catch(err => {
  console.error(err);
})
```

## util.types
`util.types` provides a number of type checks for different kinds of built-in objects. Unlike `instanceof` or `Object.prototype.toString.call(value)`, these checks do not inspect properties of the object that are accessible from JavaScript (like their prototype), and usually have the overhead of calling into C++.

`util.types` 提供了几种针对原生对象类型的检查方法。不同于 `instanceof` 或者 `Object.prototype.toString.call(value)`，这些方法不会检查来自 JavaScript（比如它们的原型对象）的可访问的属性。

The result generally does not make any guarantees about what kinds of properties or behavior a value exposes in JavaScript. They are primarily useful for addon developers who prefer to do type checking in JavaScript.

### util.types.isPromise(value)
新增于: v10.0.0

* `value` \<any\>
* Returns: \<boolean\>

如果 `value` 是原生的 Promise 对象，则返回 `true`。
```js
util.types.isPromise(Promise.resolve(42));  // Returns true
```

注意，若 `value` 是由 `util.promisify()` 方法获得的 Promise 版本函数，则返回 `false`。
```js
const util = require('util');
const fs = require('fs');

const readFilePromisily = util.promisify(fs.readFile);
const check = util.types.isPromise(readFilePromisily);

check;
// false
```