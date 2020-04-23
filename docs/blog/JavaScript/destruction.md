# ES6 变量的解构赋值
ES6允许以一定的模式，从数组和对象中提取值，从而对变量进行赋值，这被称为解构（Destructing）。

## 数组的解构
以前对多个变量赋值，只能直接指定值：
```js
let a = 1;
let b = 2;
let c = 3;
```
现在可以利用数组的解构对多个变量直接赋值：
```js
let [a, b, c] = [1, 2, 3];
// a = 1, b = 2, c = 3
```
如果解构不成功，变量的值就等于`undefined`。
```js
let [foo] = [];
let [bar, foo] = [1];
```
以上解构失败的变量值都等于`undefined`。

另一种情况是不完全解构，即等号左边的模式只部分匹配右边的数组，这种情况依然可以结构成功：
```js
let [x, y] = [1, 2, 3];
x // 1
y // 2

let [a, [b], d] = [1, [2, 3], 4];
a // 1
b // 2
d // 4
```
如果等号右边不是数组，或不是可遍历的结构，就会报错：
```js
// 报错
let [foo] = 1;
let [foo] = false;
let [foo] = NaN;
let [foo] = undefined;
let [foo] = null;
let [foo] = {};
```

### 实质
数组的解构赋值实际上是*模式的匹配*，只要等式两边的模式相等，左边的变量就会被赋予对应的值：
```js
let [foo, [[bar], baz]] = [1, [[2], 3]];
foo // 1
bar // 2
baz // 3

let [ , , third] = ["foo", "bar", "baz"];
third // "baz"

let [x, , y] = [1, 2, 3];
x // 1
y // 3

let [head, ...tail] = [1, 2, 3, 4];
head // 1
tail // [2, 3, 4]

let [x, y, ...z] = ['a'];
x // "a"
y // undefined
z // []
```
### 默认值
解构赋值允许使用默认值：
```js
let [x, y = 2] = [1];
// x = 1, y = 2;

let [foo = 'a'] = [];
// foo = 'a'
```
::: warning 注意
只有当变量模式对应的值严格（===）等于undefined时，才会使用默认值
:::
例如：
```js
let [x = 1] = [undefined];
x // 1

let [x = 1] = [null];
x // null
```
如果默认值是一个表达式，那么它是惰性求值的，即模式对应值严格等于undefined时，才会执行表达式去求值：
```js
function f() {
  console.log('aaa');
}

let [x = f()] = [1];
```
上面代码中，因为x可以取到值，所以函数f根本不会执行。
::: warning 注意
解构赋值仍然属于let声明变量的范围，所以例如*暂时性死区*的特性依然有效，你无法在变量声明前就使用它！
:::
例如：
```js
let [x = 1, y = x] = []; // x = 1; y = 1
let [x = y, y = 1] = [];     // ReferenceError: y is not defined
```

## 对象的解构
解构赋值不仅可以用于数组，还可用于解构对象：
```js
let { foo, bar } = { foo: "aaa", bar: "bbb" };
foo // "aaa"
bar // "bbb"
```
数组解构的过程因为数组的元素是按次序排列的，所以变量的取值由它的位置决定；在对象的解构赋值中，变量的顺序无关紧要，只要模式匹配，就可以对相应的变量进行赋值。匹配失败的变量值为`undefined`。
```js
let { bar, foo } = { foo: "aaa", bar: "bbb" };
foo // "aaa"
bar // "bbb"

let { baz } = { foo: "aaa", bar: "bbb" };
baz // undefined
```
### 对象属性的简写
ES6允许直接写入变量和函数，作为对象的属性和方法。也就是说，当属性和变量同名时，可以省略变量：
```js
const foo = 'bar';
const baz = {foo};
baz // {foo: "bar"}

// 等同于
const baz = {foo: foo};
```
### 实质
正是由于对象属性可以简写，所以对象的解构赋值的内部机制，是先找到同名属性，然后再赋给对应的变量。真正被赋值的是*后者*，而不是前者。第一个例子比较有迷惑性，但是本质上，对象的解构赋值依然属于模式匹配：
```js
// let { foo, bar } = { foo: "aaa", bar: "bbb" };
// 等同于
let { foo: foo, bar: bar } = { foo: "aaa", bar: "bbb" };
foo // "aaa"
bar // "bbb"

let { foo: baz } = { foo: "aaa", bar: "bbb" };
baz // "aaa"
foo // error: foo is not defined
```

与数组一样，解构也可以用于嵌套结构的对象。
```js
let obj = {
  p: [
    'Hello',
    { y: 'World' }
  ]
};

let { p, p: [x, { y }] } = obj;
x // "Hello"
y // "World"
p // ["Hello", {y: "World"}]
```
### 默认值
对象的解构赋值也可以使用默认值，当且仅当模式对应的值严格等于`undefined`时，默认值才会被启用：
```js
var {x = 3} = {};
x // 3

var {x, y = 5} = {x: 1};
x // 1
y // 5

var {x: y = 3} = {};
y // 3

var {x = 3} = {x: undefined};
x // 3

var {x = 3} = {x: null};
x // null
```
如果解构模式是嵌套的对象，而且子对象所在的父属性不存在，那么将会报错。
```js
// 报错
let {foo: {bar}} = {baz: 'baz'};
```
上面代码中，等号左边对象的foo属性，对应一个子对象。该子对象的bar属性，解构时会报错。原因很简单，因为foo这时等于`undefined`，再取子属性就会报错。

如果要将一个已经声明的变量用于解构赋值，必须非常小心。
```js
// 错误的写法
let x;
{x} = {x: 1};
// SyntaxError: syntax error
```
::: danger 警告
上面代码的写法会报错，因为 JavaScript 引擎会将{x}理解成一个代码块，从而发生语法错误。只有不将大括号写在行首，避免 JavaScript 将其解释为代码块，才能解决这个问题。
:::
```js
// 正确的写法
let x;
({x} = {x: 1});
```
对象解构最常用到的地方，是从已有对象中提取属性或方法：
```js
let { log, sin, cos } = Math;
```
由于数组本质是特殊的对象，因此可以对数组进行对象属性的解构。
```js
let arr = [1, 2, 3];
let {0 : first, [arr.length - 1] : last} = arr;
first // 1
last // 3
```

## 字符串、数字、布尔值的解构
在对一些基本类型的值进行解构时，本质上还是将它们转化为对应的对象，然后可以以对应属性为模式来提取值。

特别地，字符串可以转换为一个类似数组的对象进行值的提取：
```js
const [a, b, c, d, e] = 'hello';
a // "h"
b // "e"
c // "l"
d // "l"
e // "o"

let {length : len} = 'hello';
len // 5

let {toString: s} = 123;
s === Number.prototype.toString // true

let {toString: s} = true;
s === Boolean.prototype.toString // true
```
解构赋值的规则是，只要等号右边的值不是对象或数组，就先将其转为对象。由于`undefined`和`null`无法转为对象，所以对它们进行解构赋值，都会报错。

## 函数参数的解构
函数的参数也可以使用解构赋值。
```js
function add([x, y]){
  return x + y;
}

add([1, 2]); // 3
```
上面代码中，函数add的参数表面上是一个数组，但在传入参数的那一刻，数组参数就被解构成变量x和y。对于函数内部的代码来说，它们能感受到的参数就是x和y。

函数参数的解构也可以使用默认值。
```js {1}
function move({x = 0, y = 0} = {}) {
  return [x, y];
}

move({x: 3, y: 8}); // [3, 8]
move({x: 3}); // [3, 0]
move({}); // [0, 0]
move(); // [0, 0]
```
同样只有`undefined`才会触发默认值

## 圆括号问题
解构赋值虽然很方便，但是解析起来并不容易。对于编译器来说，一个式子到底是模式，还是表达式，没有办法从一开始就知道，必须解析到（或解析不到）等号才能知道。因此，建议只要有可能，就不要在模式中放置圆括号。

### 不可以使用的情况
因为解构赋值都是变量声明语句，所以模式不能使用圆括号：
```js
// 全部报错
let [(a)] = [1];

let {x: (c)} = {};
let ({x: c}) = {};
let {(x: c)} = {};
let {(x): c} = {};

// 报错
function f([(z)]) { return z; }

// 赋值语句
// 全部报错
({ p: a }) = { p: 42 };
([a]) = [5];
```
### 可以使用的情况
可以使用圆括号的情况只有一种：赋值语句的非模式部分，可以使用圆括号。
```js
[(b)] = [3]; // 正确，等价于：{0: (b)} = [3]
({ p: (d) } = {}); // 正确
[(parseInt.prop)] = [3]; // 正确
```

## 主要用途
变量的解构赋值用途很多。
### 交换变量的值
```js
let x = 1;
let y = 2;

[x, y] = [y, x];
```
上面代码交换变量x和y的值，这样的写法不仅简洁，而且易读，语义非常清晰。
### 取出从函数返回的多个值
函数只能返回一个值，如果要返回多个值，只能将它们放在数组或对象里返回。有了解构赋值，取出这些值就非常方便。
```js
// 返回一个数组

function example() {
  return [1, 2, 3];
}
let [a, b, c] = example();

// 返回一个对象

function example() {
  return {
    foo: 1,
    bar: 2
  };
}
let { foo, bar } = example();
```
### 提取JSON中的数据
解构赋值对提取 JSON 对象中的数据，尤其有用。
```js
let jsonData = {
  id: 42,
  status: "OK",
  data: [867, 5309]
};

let { id, status, data: number } = jsonData;

console.log(id, status, number);
// 42, "OK", [867, 5309]
```
### 函数默认值
```js {9}
jQuery.ajax = function (url, {
  async = true,
  beforeSend = function () {},
  cache = true,
  complete = function () {},
  crossDomain = false,
  global = true,
  // ... more config
} = {}) {
  // ... do stuff
};
```
### 输入模块的指定方法
加载模块时，往往需要指定输入哪些方法。解构赋值使得输入语句非常清晰。
```js
const { SourceMapConsumer, SourceNode } = require("source-map");
```