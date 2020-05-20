# Koa 源码解析（一）

:::tip 提示
本源码解析参考 [Koa v2.11.0](https://github.com/koajs/koa/tree/2.11.0) 版本代码

**原创文章，转载请联系作者[Styx](https://github.com/Styx11)！**
:::

## 前言
最近一段时间我比较多地接触了 [Koa](https://koajs.docschina.org) 这个 Node.js 框架，期间踩了不少坑也受了不少气觉得它设计得有点“不近人情”或者说是对“简洁”的追求有些偏执而忽略了程序员的需求，所以我就在闲暇时间读了它和周边中间件的源码，在结合自己曾经在代码设计中的思考后觉得自己稍微理解了它的这种“低层次，小而精”的设计理念，所以在这之后我觉得自己需要写几篇关于 Koa 的源码解析——不仅是在技术上提高对它的认知，也是想更多地学习这种代码思想。

## 介绍
> 由 Express 原班人马打造的 koa，致力于成为一个更小、更富有表现力、更健壮的 web 开发框架。使用 koa 编写 web 应用，通过组合不同的中间件，可以免除重复繁琐的回调函数嵌套，并极大地提升常用错误处理效率。Koa 不在内核中打包任何中间件，它仅仅提供了一套优雅的函数库，使得编写 Web 应用变得得心应手。

从官方的介绍中我们可以看出 koa 提供的仅仅是功能上（组合中间件与默认的错误处理）和接口上（抽象函数）的内容而非提供整套的解决方案，这就给了用户极大的自由去处理一个请求并且不会被繁琐的回调函数和潜在的错误所困扰。那么对我来说 koa 能够“更小、更富表现力”的原因主要体现在两点：

1. 基于`async/await`语法的中间件以“类栈”（stack-like）的形式运行，让用户可以在**低层次**上控制整个处理流程
2. 将原生的 Node HTTP 对象抽象成一个**高层次**的上下文`context`，为用户提供了更简洁的编程接口并且减少了不同中间件之间的复杂性。

## Koa vs Express
在[官方指南](https://github.com/koajs/koa/blob/2.11.0/docs/koa-vs-express.md)中我们可以很清楚地看到这两个框架的区别：
> Philosophically, Koa aims to "fix and replace node", whereas Express "augments node". Thus, Koa can be viewed as an abstraction of node.js's http modules, where as Express is an application framework for node.js.

koa 暴露抽象后的`ctx.response`和`ctx.request`属性作为用户处理请求的接口，减少了不同中间件的差异。它简化了错误处理的同时还使用`async/await`语法组合中间件避免了“回调地狱”，所以 koa 可以看成是一个更好的、更高层次的`http`模块；另一方面，express 作为一个“大而全”的**应用**框架，它会在原生的 node 对象上添加额外的属性来提供更多的功能，比如模版、路由和 JSON 解析等，所以在 express 上我们会更接近原生 node.js。

对于我们用户来说其实不存在 koa 和 express 之间的孰优孰劣或者谁取代谁的情况，毕竟两款框架面向的场景是不同的。如果你想要一个可以“开箱即用”的框架，express 会比较适合你，那如果你想更接近底层地控制整个处理流程但又不愿被繁琐的错误处理、回调函数困扰，同时还想使用`http`的高级语法糖，那 koa 会是不错的选择。

## 思路
那么根据对 koa 的了解，我会将源码的解析分为两部分：
1. 在功能上 koa 是如何运行的，比如注册执行中间件、`app.callback`和`app.listen`如何创建并开启一个服务器。

2. 在内容上 koa 如何在上下文`context`里提供高级的语法糖，因为这一部分包括所有面向用户的 API，所以我只会挑一些常用的部分讲，比如`ctx.body`、`ctx.onerror`等。

因为 koa 内部并不包含额外的中间件，所以它实际的代码内容大致只有上面这两点，是比较容易阅读学习的。那么在下一篇我将正式开始对 koa 的源码分析。

<SourceLink filepath='/Koa/README.md'/>
<LastEditTime filepath='/Koa/README.md'/>