# ES6 let 与 const

在ES6中`let`与`const`都是用于声明变量的关键字，大致用法类似与`var`。

## let与const的相同点

::: tip let&const
1. 不存在变量提升
2. 暂时性死区
3. 相同作用域内变量不允许被重复声明
4. 块级作用域
:::

## let与const的不同点
基本上`let`具有的特性`const`都有，所以它们的不同点主要在于`const`额外的特性：

::: tip const
1. const声明的变量不可变
2. 由于变量不可变，所以const声明的变量必须进行初始化赋值
:::

## 不存在变量提升
在ES5中如果我们运行一下代码并不会报错：
```js {4}
console.log(foo);
var foo = 123

// 我们会得到undefined
```
之所以出现这种情况，是因为`var`声明的变量可以被提前使用，就像用`function`声明的函数被提升至最顶部一样。根据编程规范我们应该先声明再使用变量。

ES6中的`let`和`const`不允许出现这种情况：
```js
console.log(bar);
let bar = 321;
// const bar = 321;

// 报错ReferenceError
```

## 暂时性死区
只要块级作用域内存在`let`或`const`命令，它们所声明的变量就会绑定到该作用域，不受外部的影响
```js
var tmp = 123;

if (true) {
  tmp = 'abc'; // ReferenceError
  let tmp;
}
```
以上代码之所以会报错，就是因为在块级作用域内存在`let`或`const`命令，所以它所声明的变量就进入 **死区**，在声明前无法被使用。语法上称为“暂时性死区”（temporal dead zone，简称 TDZ）。

以下是几个暂时性死区的例子：
```js
typeof x; // ReferenceError
let x;
```
( typeof操作变得不再安全 )

```js
function bar(x = y, y = 2) {
  return [x, y];
}

bar(); // 报错
```
( 报错是因为 x=y 中的 y 还未被声明 )

```js
// 不报错
var x = x;

// 报错
let x = x;
// ReferenceError: x is not defined
```
ES6 规定暂时性死区和`let`、`const`语句不出现变量提升，主要是为了减少运行时错误，防止在变量声明前就使用这个变量，从而导致意料之外的行为。这样的错误在 ES5 是很常见的，现在有了这种规定，避免此类错误就很容易了。

## 不允许重复声明
使用`var`多次声明同一变量时，实际上我们只会得到一个变量：
```js
function f(x) {
    var x;
    var x;

    if (true) {
        var x;
    }
}
```
在上面的例子里，所有x的声明实际上都引用一个相同的x，并且这是完全有效的代码。 这经常会成为bug的来源。`let`和`const`声明就不会这么宽松了。

`let`和`const`不允许在相同作用域内重复声明同一变量。
```js
// 报错
function func() {
  let a = 10;
  var a = 1;
}

// 报错
function func() {
  let a = 10;
  let a = 1;
}
```

因此不允许在函数的第一层作用域内声明和参数同名的变量
```js
function func(arg) {
  let arg; // 报错
}

function func(arg) {
  {
    let arg; // 不报错
  }
}
```

## 块级作用域

### 为什么会需要块级作用域？
在ES5中我们只有全局作用域和函数作用域，这就会导致一些常见的问题：
```js
var a = [];
for (var i=0; i<10; i++) {
  a[i] = function () {
    console.log(i);
  }
}
a[5]() // 10
```
由于不存在块级作用域，for循环中的i实际上一直是同一个变量，所以数组a内每个函数所输出的i都是指向同一个变量。

要解决这个问题，我们通常使用立即执行函数（IIFE）：
```js
var a = [];
for (var i=0; i<10; i++) {
  (function (e) {
    a[i] = function () {
      console.log(e);
    }
  })(i);
}
a[5]();// 5
```
为什么这样可行？因为函数是按值传递的，并且`function`内部会开辟新的变量环境，所以对IIFE传入参数i后，内部就保存了唯一的数据，这样每个函数就输出唯一的值。

### ES6的块级作用域
ES6中的块级作用域就解决了这样的问题：
```js
let a = [];
for (let i=0; i<10; i++) {
  a[i] = function () {
    console.log(i);
  }
}
a[5]() // 5
```
变量由let声明，于是启用了块级作用域，每次循环的i在各自的变量环境内都是独一无二的，即函数内部保存了唯一的值，而i值的计算就交给了浏览器。

`let`、`const`实际上为 JavaScript 新增了块级作用域。
```js
function f1() {
  let n = 5;
  if (true) {
    let n = 10;
  }
  console.log(n); // 5
}
```
由于块级作用域的存在，外部无法访问内部变量，并且变量的声明也不会冲突，即在内作用域声明的变量会*屏蔽*外层作用域内相同的变量。

## const
前面介绍的特性都是`lei`和`const`共有的，所以大多数情况下可以用const代替let。
### 变量声明必须初始化
`const`声明一个只读的常量。一旦声明，常量的值就不能改变。

这其实就意味着声明的变量必须给定一个初始值。

```js
const foo;
// SyntaxError: Missing initializer in const declaration
```
（你必须初始化变量）

### 关于变量值不可变
实际上`const`所保证的，是简单类型的变量不可变：
```js
const PI = 3.1415;
PI // 3.1415

PI = 3;
// TypeError: Assignment to constant variable.
```
（你无法改变常量的值！）
但对于引用类型的值（Object、Array、Function），const只能保证引用它们的指针值不可变，也就是说你可以通过指针修改它们内部实际的值，但你不能直接改变它的指针引用另一个变量值：
```js
const foo = {};

// 为 foo 添加一个属性，可以成功
foo.prop = 123;
foo.prop // 123

// 将 foo 指向另一个对象，就会报错
foo = {}; // TypeError: "foo" is read-only
```
上面代码中，常量`foo`储存的是一个地址，这个地址指向一个对象。不可变的只是这个地址，即不能把`foo`指向另一个地址，但对象本身是可变的，所以依然可以为其添加新属性。

如果真的想将对象冻结，应该使用`Object.freeze`方法。
```js
const foo = Object.freeze({});

// 常规模式时，下面一行不起作用；
// 严格模式时，该行会报错
foo.prop = 123;
```
（你无法添加新的属性）

除了将对象本身冻结，对象的属性也应该冻结。下面是一个将对象彻底冻结的函数。
```js
const constantize = (obj) => {
  Object.freeze(obj);
  Object.keys(obj).forEach( (key, i) => {
    if ( typeof obj[key] === 'object' ) {
      constantize( obj[key] );
    }
  });
};

```