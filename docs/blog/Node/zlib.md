# Zlib 压缩
`zlib`模块提供通过 Gzip 和 Deflate/Inflate 实现的压缩功能，可以通过这样使用它：
```js
const zlib = require('zlib');
```

`zlib` 可以用来实现对 HTTP 中定义的 `gzip` 和 `deflate` 内容编码机制的支持。

HTTP 的 `Accept-Encoding` 头字段用来标记客户端接受的压缩编码。

针对两种不同的编码格式，`zlib`提供了基于流数据的 API 和基于回调函数的异步/同步 API 。

## 基于流数据的 API
### zlib.createDeflate([options])
创建并返回一个带有给定 [options][] 的新的 [Deflate][] 对象。

### zlib.createInflate([options])
创建并返回一个带有给定 options 的新的 [Inflate][] 对象。
```js
const zlib = require('zlib');
const fs = require('fs');

const test = fs.createReadStream('./test.txt');
const testOutput = fs.createWriteStream('./test.output.txt');

test
  .pipe(zlib.createDeflate())// 压缩
  .pipe(zlib.createInflate())// 解压缩
  .pipe(testOutput);
```

### zlib.createGzip([options])
创建并返回一个带有给定 options 的新的 [Gzip][] 对象。

### zlib.createGunzip([options])
创建并返回一个带有给定 options 的新的 [Gunzip][] 对象。
```js
const zlib = require('zlib');
const fs = require('fs');

const gzip = zlib.createGzip();
const gunzip = zlib.createGunzip();
const sou = fs.createReadStream('./test.txt');
const tar = fs.createWriteStream('./test.txt.gz');

sou
  .pipe(gzip)// 创建压缩文件
  .pipe(gunzip)// 解压缩文件
  .pipe(tar);
```

### zlib.createUnzip([options])
创建并返回一个带有给定 options 的新的 [Unzip][] 对象。

该对象可对两种格式进行解压缩。

## 基于回调的 API
所有这些方法都将 Buffer, [TypeArray][], DataView, 或者字符串作为第一个参数, 一个回调函数作为可选的第二个参数提供给 `zlib` 类, 会在 `callback(error, result)` 中调用。

### zlib.deflate(buffer[, options], callback)
* `buffer` \<Buffer\> | \<TypedArray\> | \<DataView\> | \<ArrayBuffer\> | \<string\>
* `options` \<Object\>
* `callback` \<Function\>

### zlib.inflate(buffer[, options], callback)
* `buffer` \<Buffer\> | \<TypedArray\> | \<DataView\> | \<ArrayBuffer\> | \<string\>
* `options` \<Object\>
* `callback` \<Function\>

```js
const input = '.................................';
zlib.deflate(input, (err, buffer) => {
  if (!err) {
    console.log(buffer.toString('base64'));// eJzT0yMAAGTvBe8=
  } else {
    // 错误处理
  }
});

const buffer = Buffer.from('eJzT0yMAAGTvBe8=', 'base64');
zlib.inflate(buffer, (err, buffer) => {
  if (!err) {
    console.log(buffer.toString());
  } else {
    // 错误处理
  }
});
```

### zlib.gzip(buffer[, options], callback)
* `buffer` \<Buffer\> | \<TypedArray\> | \<DataView\> | \<ArrayBuffer\> | \<string\>
* `options` \<Object\>
* `callback` \<Function\>

### zlib.gunzip(buffer[, options], callback)
* `buffer` \<Buffer\> | \<TypedArray\> | \<DataView\> | \<ArrayBuffer\> | \<string\>
* `options` \<Object\>
* `callback` \<Function\>

### zlib.unzip(buffer[, options], callback)
* `buffer` \<Buffer\> | \<TypedArray\> | \<DataView\> | \<ArrayBuffer\> | \<string\>
* `options` \<Object\>
* `callback` \<Function\>

该方法可对两种格式进行解压缩。

## 例子
下面这个例子中，我们作为客户端对目标地址发出了请求，并设置了 `Accept-Encoding` 为 `'gzip,deflate'` 表示接受的编码格式，当得到响应后对结果进行解压缩。
```js
// 客户端请求示例
const zlib = require('zlib');
const http = require('http');
const fs = require('fs');
const header = {
  host: 'example.com',
  path: '/',
  port: 80,
  headers: { 'Accept-Encoding': 'gzip,deflate' }
}
// 对示例 url 发出客户端请求
const request = http.get(header);
// 处理响应
request.on('response', (response) => {
  const output = fs.createWriteStream('example.com_index.html');

  switch (response.headers['content-encoding']) {
    // 或者, 只是使用 zlib.createUnzip() 方法去处理这两种情况
    case 'gzip':
      response.pipe(zlib.createGunzip()).pipe(output);
      break;
    case 'deflate':
      response.pipe(zlib.createInflate()).pipe(output);
      break;
    default:
      response.pipe(output);
      break;
  }
});
```

在这个例子里，我们创建了一个服务器。当有请求被接受时，解析请求首部的 `accept-encoding` 根据编码格式进行相应的文件压缩，并在响应首部中表明 `Content-Encoding` ，最终返回结果。
```js
// 服务端示例
// 对每一个请求运行 gzip 操作的成本是十分高昂的.
// 缓存压缩缓冲区是更加高效的方式.
const zlib = require('zlib');
const http = require('http');
const fs = require('fs');
const server = http.createServer((request, response) => {
  const raw = fs.createReadStream('index.html');
  let acceptEncoding = request.headers['accept-encoding'];
  if (!acceptEncoding) {
    acceptEncoding = '';
  }
  // 注意：这不是一个合适的 accept-encoding 解析器.
  // 查阅 https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.3
  if (/\bdeflate\b/.test(acceptEncoding)) {
    response.writeHead(200, { 'Content-Encoding': 'deflate' });
    raw.pipe(zlib.createDeflate()).pipe(response);
  } else if (/\bgzip\b/.test(acceptEncoding)) {
    response.writeHead(200, { 'Content-Encoding': 'gzip' });
    raw.pipe(zlib.createGzip()).pipe(response);
  } else {
    response.writeHead(200, {});
    raw.pipe(response);
  }
});

server.listen(8080);
```