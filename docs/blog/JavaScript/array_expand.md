# ES6 数组的扩展

## 扩展运算符
扩展运算符（spread）写作三个点（`...`）。它好比是rest的逆运算，可以把数组转化为用逗号分隔的参数序列。
```js
console.log(...[1, 2, 3]);
// 1, 2, 3

console.log(1, ...[2, 3, 4], 5);
// 1, 2, 3, 4, 5
```

扩展运算符经常用于函数调用，当函数需要多个参数时，你可以用扩展运算符将数组内的数据作为参数序列传给函数。
```js
function push (arr, item) {
  arr.push(...item);
}

function add (x, y) {
  return x + y;
}

const nums = [3, 6];
add(...nums);
// 9
```
上面代码中，`array.push(...items)`和`add(...numbers)`这两行，都是函数的调用，它们的都使用了扩展运算符。该运算符将一个数组，变为参数序列。

扩展运算符与正常的函数参数可以结合使用，非常灵活。
```js
function f (v, w, x, y, z) {}

const args = [0, 1];
f(-1, ...args, 2, ...[3]);
```

扩展运算符后面还可以跟表达式。
```js
const arr = {
  ...(x > 0 ? ['a'] : []),
  'b',
};
```

如果扩展运算符后面是一个空数组，那么它不会产生任何效果。
```js
[...[], 1]
// [1]
```

::: danger 警告
如果在一对圆括号内使用扩展运算符，则JavaScrip引擎会认为那是一个函数调用，如果实际上不是，则会报错。
:::
例如：
```js
(...[1, 2])
// Uncaught SyntaxError: Unexpected number

console.log((...[1, 2]))
// Uncaught SyntaxError: Unexpected number

console.log(...[1, 2])
// 1, 2
```
### apply 和 call
每个函数都包含了两个非继承而来的方法：`apply()`和`call()`，这两个方法的用途都是在特定的作用域内调用函数，实际上等于设置函数内部`this`的值。

首先，`apply()`方法接收两个参数：一个是在其中运行函数的作用域，另一个是参数数组。其中，第二个参数可以是`Array`的实例，也可以是`arguments`对象。例如:
```js
function sum(num1, num2){
    return num1 + num2;
}
function callSum1(num1, num2){
    return sum.apply(this, arguments);// 传入 arguments 对象
}
function callSum2(num1, num2){
    return sum.apply(this, [num1, num2]);// 传入数组
}
console.log(callSum1(10,10));   //20
console.log(callSum2(10,10));   //20
```
所以，`apply()`经常用来将数组作为参数去调用需要多个参数的函数。
```js
function f(x, y, z) {
  // ...
}
var args = [0, 1, 2];
f.apply(null, args);
```

`call()`在设置作用域上与`apply()`没有不同，区别在于`call()`不接收数组作为参数，你只能一个一个传入参数。
```js
function sum(num1, num2){
    return num1 + num2;
}
function callSum(num1, num2){
    return sum.call(this, num1, num2);
}
console.log(callSum(10,10));   //20
```

### 代替函数的apply方法
由于扩展运算符可以展开数组，所以不再需要apply方法，将数组转为函数的参数了。
```js
// ES5 的写法
function f(x, y, z) {
  // ...
}
var args = [0, 1, 2];
f.apply(null, args);

// ES6的写法
function f(x, y, z) {
  // ...
}
let args = [0, 1, 2];
f(...args);
```
下面是扩展运算符取代apply方法的一个实际的例子，应用Math.max方法，简化求出一个数组最大元素的写法。
```js
// ES5 的写法
Math.max.apply(null, [14, 3, 77])

// ES6 的写法
Math.max(...[14, 3, 77])

// 等同于
Math.max(14, 3, 77);
```
上面代码中，由于 JavaScript 不提供求数组最大元素的函数，所以只能套用`Math.max`函数，将数组转为一个参数序列，然后求最大值。有了扩展运算符以后，就可以直接用`Math.max`了。

另一个例子是调用`push`，将一个数组添加到另一个数组后面。
```js
// ES5的 写法
var arr1 = [0, 1, 2];
var arr2 = [3, 4, 5];
Array.prototype.push.apply(arr1, arr2);

// ES6 的写法
let arr1 = [0, 1, 2];
let arr2 = [3, 4, 5];
arr1.push(...arr2);
```
上面代码的 ES5 写法中，`push`方法的参数不能是数组，所以只好通过`apply`方法变通使用`push`方法。有了扩展运算符，就可以直接将数组传入`push`方法。

### 主要应用
#### 1. 复制数组
数组是复合的数据类型，直接复制的话只能得到指向真正数据的指针，修改其中一个会导致另一个的变化。

ES5 只能通过变通的方法来克隆数组。
```js
const a1 = [1, 2];
const a2 = a1.concat();

a2[0] = 2;
// a[0] = 1
```

扩展运算符提供了更简便的方法。
```js
const a1 = [1, 2];

// 方法1
const a2 = [...a1];

// 方法2
const [...a2] = a1;
```
上面的两种写法，a2都是a1的克隆。

#### 2. 合并数组
扩展运算符提供了合并数组的新方法。
```js
const a1 = ['a', 'b'];
const a2 = ['c'];
const a3 = ['d', 'e'];

// ES5 写法
a1.concat(a2, a3);
// [ 'a', 'b', 'c', 'd', 'e' ]

// ES6 写法
[...a1, ...a2, ...a3]
// [ 'a', 'b', 'c', 'd', 'e' ]
```
不过，这两种方法都是浅拷贝。
```js
const a1 = [{foo: 1}];
const a2 = [{bar: 2}];

const a3 = a1.concat(a2);
const a4 = [...a1, ...a2];

a3[0] === a1[0];// true
a4[0] === a1[0];// true
```
上面代码中，a3和a4是通过不同方法合并的数组，但它们的成员都是对原数组的引用。如果修改了原数组的成员，会同步反映到新数组。

#### 3. 与解构赋值结合
扩展运算符还可以和解构赋值结合起来，用于生成数组。
```js
const [first, ...rest] = [1, 2, 3, 4, 5];
first// 1
rest// [2, 3, 4, 5]

const [first, ...rest] = [];
first// undefined
rest// []

const [first, ...rest] = ['foo'];
first// 'foo'
rest// []
```

::: warning 注意
如果将扩展运算符用于解构赋值，只能将它放在最后一位，否则会报错。
:::

例如：
```js
const [...butLast, last] = [1, 2, 3, 4, 5];
// 报错

const [first, ...middle, last] = [1, 2, 3, 4, 5];
// 报错
```

#### 4. 字符串
扩展运算符还可以将字符串转化为数组。
```js
[...'hello']
// ['h', 'e', 'l', 'l', 'o']
```
上面的写法，有一个重要的好处，那就是能够正确识别四个字节的 Unicode 字符。
```js
'x\uD83D\uDE80y'.length // 4
[...'x\uD83D\uDE80y'].length // 3
```
上面代码的第一种写法，JavaScript 会将四个字节的 Unicode 字符，识别为 2 个字符，采用扩展运算符就没有这个问题。因此，正确返回字符串长度的函数，可以像下面这样写。
```js
function length(str) {
  return [...str].length;
}

length('x\uD83D\uDE80y') // 3
```
凡是涉及到操作四个字节的 Unicode 字符的函数，都有这个问题。因此，最好都用扩展运算符改写。
```js
let str = 'x\uD83D\uDE80y';

str.split('').reverse().join('')
// 'y\uDE80\uD83Dx'

[...str].reverse().join('')
// 'y\uD83D\uDE80x'
```
上面代码中，如果不用扩展运算符，字符串的`reverse`操作就不正确。

## API拓展
### Array.from()
`Array.from`方法用于将两类对象转为真正的数组：类似数组的对象（array-like object）和可遍历（iterable）的对象（包括 ES6 新增的数据结构 Set 和 Map）。

`Array.from`方法支持类似数组的对象。所谓类似数组的对象，本质特征只有一点，即必须有`length`属性。因此，任何有`length`属性的对象，都可以通过`Array.from`方法转为数组，而此时扩展运算符就无法转换。对于还没有部署该方法的浏览器，可以用`Array.prototype.slice`方法替代。

下面是一个类似数组的对象，`Array.from`将它转为真正的数组。
```js
let arrayLike = {
    '0': 'a',
    '1': 'b',
    '2': 'c',
    length: 3
};

// ES5的写法
var arr1 = [].slice.call(arrayLike); // ['a', 'b', 'c']

// ES6的写法
let arr2 = Array.from(arrayLike); // ['a', 'b', 'c']
```
实际应用中，常见的类似数组的对象是 DOM 操作返回的 NodeList 集合，以及函数内部的`arguments`对象。`Array.from`都可以将它们转为真正的数组。
```js
// NodeList对象
let ps = document.querySelectorAll('p');
Array.from(ps).filter(p => {
  return p.textContent.length > 100;
});

// arguments对象
function foo() {
  var args = Array.from(arguments);
  // ...
}
```
上面代码中，`querySelectorAll`方法返回的是一个类似数组的对象，可以将这个对象转为真正的数组，再使用`filter`方法。

值得提醒的是，扩展运算符（`...`）也可以将某些数据结构转为数组。
```js
// arguments对象
function foo() {
  const args = [...arguments];
}

// NodeList对象
[...document.querySelectorAll('div')]
```
### Array.of()
`Array.of()`方法，用于将一个参数序列转化为数组。
```js
Array.of(1, 2, 3)// [1, 2, 3]
Array.of()// []
Array.of(3).length// 1
```
这个方法的主要目的，是弥补数组构造函数`Array()`的不足。因为参数个数的不同，会导致`Array()`的行为有差异。
```js
Array() // []
Array(3) // [, , ,]
Array(3, 11, 8) // [3, 11, 8]
```
上面代码中，`Array`方法没有参数、一个参数、三个参数时，返回结果都不一样。只有当参数个数不少于 2 个时，A`rray()`才会返回由参数组成的新数组。参数个数只有一个时，实际上是指定数组的长度。

`Array.of`基本上可以用来替代`Array()`或`new Array()`，并且不存在由于参数不同而导致的重载。它的行为非常统一。
```js
Array.of() // []
Array.of(undefined) // [undefined]
Array.of(1) // [1]
Array.of(1, 2) // [1, 2]
```
`Array.of`方法可以用下面的代码实现：
```js
function ArrayOf(){
  return [].slice.call(arguments);
}
```
### arr.find(), arr.findIndex()
数组实例的`find`方法，用于找到第一个符合条件的数组成员。它接收一个回调函数，数组成员依次执行，直到找到并返回一个返回值为`true`的成员。如果没有符合条件的成员，则返回`undefined`。
```js
[1, 5, 10, 15].find((value, index, arr) => value > 9) // 10
```
上面代码中，`find`方法的回调函数可以接受三个参数，依次为当前的值、当前的位置和原数组。

数组实例的`findIndex`方法的用法与之对应，返回第一个符合条件的数组成员的位置，如果所有成员都不符合条件，则返回`-1`。
```js
[1, 5, 10, 15].find((value, index, arr) => value > 9) // 2
```
这两个方法都可以接受第二个参数，用来绑定回调函数的`this`对象。
```js
function f(v){
  return v > this.age;
}
let person = {name: 'John', age: 20};
[10, 12, 26, 15].find(f, person);    // 26
```
上面的代码中，`find`函数接收了第二个参数`person`对象，回调函数中的`this`对象指向`person`对象。

另外，`indexOf`方法无法识别数组的`NaN`成员，但是`findIndex`方法可以借助O`bject.is`方法做到。
```js
[NaN].indexOf(NaN)
// -1

[NaN].findIndex(y => Object.is(NaN, y))
// 0
```

### arr.fill()
`fill`方法使用给定值，填充一个数组。
::: warning 注意
如果填充的类型为对象，那么被赋值的是同一个内存地址的对象，而不是深拷贝对象。
:::
例如：
```js
['a', 'b', 'c'].fill(7)
// [7, 7, 7]

let arr = new Array(3).fill({name: "Mike"});
arr[0].name = "Ben";
arr
// [{name: "Ben"}, {name: "Ben"}, {name: "Ben"}]

let arr = new Array(3).fill([]);
arr[0].push(5);
arr
// [[5], [5], [5]]

```
`fill`方法用于空数组的初始化非常方便。数组中已有的元素，会被全部抹去。

`fill`方法还可以接受第二个和第三个参数，用于指定填充的起始位置和结束位置。
```js
['a', 'b', 'c'].fill(7, 1, 2)
// ['a', 7, 'c']
```
### arr.entries(), arr.keys()和arr.values()
ES6 提供三个新的方法——`entries()`，`keys()`和`values()`——用于遍历数组。它们都返回一个遍历器对象，可以用`for...of`循环进行遍历，唯一的区别是`keys()`是对键名的遍历、`values()`是对键值的遍历，`entries()`是对键值对的遍历。
```js
const arr = ['a', 'b'];

for (let index of arr.keys()) {
  console.log(index);
}
// 0
// 1

for (let value of arr.values()) {
  console.log(value);
}
// 'a'
// 'b'

for (let [index, value] of arr.entries()) {
  console.log(index, value);
}
// 0 'a'
// 1 'b'
```
### arr.includes()
`Array.prototype.includes`方法返回一个布尔值，表示某个数组是否包含给定的值，与字符串的`includes`方法类似。ES2016 引入了该方法。
```js
[1, 2, 3].includes(2)     // true
[1, 2, 3].includes(4)     // false
[1, 2, NaN].includes(NaN) // true
```
该方法的第二个参数表示搜索的起始位置，默认为`0`。如果第二个参数为负数，则表示倒数的位置，如果这时它大于数组长度（比如第二个参数为`-4`，但数组长度为`3`），则会重置为从`0`开始。
```js
[1, 2, 3].includes(3, 3);  // false
[1, 2, 3].includes(3, -1); // true
```
相比使用`indexOf`判断数组是否包含某个值，`includes`的表达更直观，并且不会对`NaN`误判。
```js
[NaN].indexOf(NaN)
// -1

[NaN].includes(NaN)
// true
```
### arr.flat()
数组的成员有时还是数组，`Array.prototype.flat()`用于将嵌套的数组“拉平”，变成一维的数组。该方法返回一个新数组，对原数据没有影响。如果原数组有空位，`flat()`方法会跳过空位。
```js
[1, 2, [3, 4]].flat()
// [1, 2, 3, 4]

[1, 2, , 4, 5].flat()
// [1, 2, 4, 5]
```

`flat()`默认只会“拉平”一层，如果想要“拉平”多层的嵌套数组，可以将`flat()`方法的参数写成一个整数，表示想要拉平的层数，默认为1。
```js
[1, 2, [3, [4, 5]]].flat()
// [1, 2, 3, [4, 5]]

[1, 2, [3, [4, 5]]].flat(2)
// [1, 2, 3, 4, 5]
```

如果不管有多少层嵌套，都要转成一维数组，可以用`Infinity`关键字作为参数。
```js
[1, 2, [3, [4, 5]]].flat(Infinity)
// [1, 2, 3, 4, 5]
```