# ES6 对象的扩展

## 属性的简洁表示
ES6 允许直接写入变量和函数，作为对象的属性和方法。
```js
const foo = 'bar';
const baz = {foo};
baz// {foo: 'bar'}

// 等同于
const baz = {foo: 'bar'};
```
上面代码表明，ES6 允许在对象之中，直接写变量，这时属性名为变量名，属性值为变量值。
```js
function foo (x, y) {
  return {x, y};
}

// 等同于
function foo (x, y) {
  return {x: x, y: y};
}
```
除了属性简写，方法也可以简写。
```js
const o = {
  method() {
    return 'Hello';
  }
};

// 等同于
const o = {
  method: function () {
    return 'Hello';
  }
};
```
CommonJS 模块输出一组变量，就非常合适使用简洁写法。
```js
let ms = {};

function getItem (key) {
  return key in ms ? ms[key] : null;
}

function setItem (key, value) {
  ms[key] = value;
}

function clear () {
  ms = {};
}

module.exports = { getItem, setItem, clear };
// 等同于
module.exports = {
  getItem: getItem,
  setItem: setItem,
  clear: clear
};
```
属性的赋值器（setter）和取值器（getter），事实上也是采用这种写法。
```js
const cart = {
  _wheels = 0,

  get wheels() {
    return this._wheels;
  },

  set wheels(value) {
    if (this._wheels > value) {
      throw new Error('数值太小了！');
    }
    this._wheels = value;
  }
};
```
::: warning 注意
简洁写法的属性名总是字符串，这会导致一些看上去比较奇怪的结果。
:::
例如：
```js
const obj = {
  class () {}
};

// 等同于

var obj = {
  'class': function() {}
};
```

## 属性名表达式
JavaScript 定义对象属性，有两种方法。
```js
// 方法一
obj.foo = true;

// 方法二
obj['a' + 'bc'] = 123
```
上面代码的方法一是直接用标识符作为属性名，方法二是用表达式作为属性名，这时要将表达式放在方括号之内。

但是，如果使用字面量方式定义对象（使用大括号），在 ES5 中只能使用方法一（标识符）定义属性。
```js
var obj = {
  foo: true,
  abc: 123
};
```
ES6 允许字面量定义对象时，用方法二（表达式）作为对象的属性名，即把表达式放在方括号内。
```js
const propKey = 'foo';

const obj = {
  [propKey]: true,
  ['a' + 'bc']: 123
}
```
表达式还可以用于定义方法名。
```js
const obj = {
  ['say' + 'hi']() {
    return 'hi!';
  }
};
```
::: danger 警告
属性名表达式与简洁表示法，不能同时使用，会报错。
:::
例如：
```js
// 报错
const foo = 'bar';
const bar = 'abc';
const baz = { [foo] };

// 正确
const foo = 'bar';
const baz = { [foo]: 'abc'};
```
::: warning 注意
属性名表达式如果是一个对象，默认情况下会自动将对象转为字符串`[object Object]`，这一点要特别小心。
:::
例如：
```js
const keyA = {a: 1};
const keyB = {b: 2};

const myObject = {
  [keyA]: 'valueA',
  [keyB]: 'valueB'
};

myObject // Object {[object Object]: "valueB"}
```
上面代码中，`[keyA]`和`[keyB]`得到的都是`[object Object]`，所以`[keyB]`会把`[keyA]`覆盖掉，而`myObject`最后只有一个`[object Object]`属性。

## 方法的 name 属性
函数的`name`属性，返回函数名。对象方法也是函数，因此也有`name`属性。
```js
const person = {
  sayHello() {
    return 'hello';
  }
};

person.sayHello.name// "sayHello"
```
上面代码中，方法的`name`属性返回函数名（即方法名）。

如果对象的方法使用了取值函数（getter）和存值函数（setter），则`name`属性不是在该方法上面，而是该方法的属性的描述对象的`get`和`set`属性上面，返回值是方法名前加上`get`和`set`。
```js
const obj = {
  get foo() {},
  set foo(x) {}
};

obj.foo.name
// TypeError: Cannot read property 'name' of undefined

const descriptor = Object.getOwnPropertyDescriptor(obj, 'foo');

descriptor.get.name // "get foo"
descriptor.set.name // "set foo"
```
有两种特殊情况：`bind`方法创造的函数，`name`属性返回`bound`加上原函数的名字；`Function`构造函数创造的函数，`name`属性返回`anonymous`。
```js
(new Function()).name // "anonymous"

var doSomething = function() {
  // ...
};
doSomething.bind().name // "bound doSomething"
```

## 属性的可枚举性和遍历
对象的每个属性都有一个描述对象（Descriptor），用来控制该属性的行为。`Object.getOwnPropertyDescriptor`方法可以获取该属性的描述对象。
```js
let obj = { foo: 123 };
Object.getOwnPropertyDescriptor(obj, 'foo')
//  {
//    value: 123,
//    writable: true,
//    enumerable: true,
//    configurable: true
//  }
```
描述对象的`enumerable`属性，称为“可枚举性”，如果该属性为`false`，就表示某些操作会忽略当前属性。

目前，有四个操作会忽略`enumerable`为`false`的属性。

1. for...in循环：只遍历对象自身的和继承的可枚举的属性。
2. Object.keys()：返回对象自身的所有可枚举的属性的键名。
3. JSON.stringify()：只串行化对象自身的可枚举的属性。
4. Object.assign()： 忽略enumerable为false的属性，只拷贝对象自身的可枚举的属性。

这四个操作之中，前三个是 ES5 就有的，最后一个`Object.assign()`是 ES6 新增的。其中，只有`for...in`会返回继承的属性，其他三个方法都会忽略继承的属性，只处理对象自身的属性。实际上，引入“可枚举”（enumerable）这个概念的最初目的，就是让某些属性可以规避掉`for...in`操作，不然所有内部属性和方法都会被遍历到。比如，对象原型的`toString`方法，以及数组的`length`属性，就通过“可枚举性”，从而避免被`for...in`遍历到。
```js
Object.getOwnPropertyDescriptor(Object.prototype, 'toString').enumerable
// false

Object.getOwnPropertyDescriptor([], 'length').enumerable
// false
```
上面代码中，`toString`和`length`属性的`enumerable`都是`false`，因此`for...in`不会遍历到这两个继承自原型的属性。

另外，ES6 规定，所有 Class 的原型的方法都是不可枚举的。
```js
Object.getOwnPropertyDescriptor(class {foo() {}}.prototype, 'foo').enumerable
// false
```
总的来说，操作中引入继承的属性会让问题复杂化，大多数时候，我们只关心对象自身的属性。所以，尽量不要用`for...in`循环，而用`Object.keys()`代替。

### 属性的遍历
ES6 一共有 5 种方法可以遍历对象的属性。
1. for...in
`for...in`循环遍历对象自身的和继承的可枚举属性（不含 Symbol 属性）。

2. Object.keys(obj)
`Object.keys`返回一个数组，包括对象自身的（不含继承的）所有可枚举属性（不含 Symbol 属性）的键名。

3. Object.getOwnPropertyNames(obj)
`Object.getOwnPropertyNames`返回一个数组，包含对象自身的所有属性（不含 Symbol 属性，但是包括不可枚举属性）的键名。

4. Object.getOwnPropertySymbols(obj)
`Object.getOwnPropertySymbols`返回一个数组，包含对象自身的所有 Symbol 属性的键名。

5. Reflect.ownKeys(obj)
`Reflect.ownKeys`返回一个数组，包含对象自身的所有键名，不管键名是 Symbol 或字符串，也不管是否可枚举。

以上的 5 种方法遍历对象的键名，都遵守同样的属性遍历的次序规则。
* 首先遍历所有数值键，按照数值升序排列。
* 其次遍历所有字符串键，按照加入时间升序排列。
* 最后遍历所有 Symbol 键，按照加入时间升序排列。

## super关键字
我们知道，`this`关键字总是指向函数所在的当前对象，ES6 又新增了另一个类似的关键字`super`，指向当前对象的原型对象。
```js
const proto = {
  foo: 'Hello'
};

const obj = {
  foo: 'World',
  find() {
    return super.foo;
  }
}

Object.setPrototypeOf(obj, foo)
obj.find()// 'Hello'
```
上面代码中，对象`obj.find()`方法之中，通过`super.foo`引用了原型对象`proto`的`foo`属性。

::: warning 注意
`super`关键字表示原型对象时，只能用在简写的对象的方法之中，用在其他地方都会报错。
:::
例如：
```js
// 报错
const obj = {
  foo: super.foo
}

// 报错
const obj = {
  foo: () => super.foo
}

// 报错
const obj = {
  foo: function () {
    return super.foo
  }
}
```
以上调用均会报错，因为`super`关键字只能用在简写的对象方法中，目前，只有对象方法的简写法可以让 JavaScript 引擎确认，定义的是对象的方法。

JavaScript 引擎内部，`super.foo`等同于`Object.getPrototypeOf(this).foo`（属性）或`Object.getPrototypeOf(this).foo.call(this)`（方法）。

```js
const proto = {
  x: 'hello',
  foo() {
    console.log(this.x);
  },
};

const obj = {
  x: 'world',
  foo() {
    super.foo();
  }
}

Object.setPrototypeOf(obj, proto);

obj.foo() // "world"
```
上面代码中，`super.foo`指向原型对象`proto`的`foo`方法，但是绑定的`this`却还是当前对象`obj`，因此输出的就是`world`。

## 对象的扩展运算符
ES2018 将扩展运算符（`...`）引入了对象中。

### 解构赋值
对象的解构赋值用于从一个对象取值，相当于将目标对象自身的所有可遍历的（enumerable）、但尚未被读取的属性，分配到指定的对象上面。所有的键和它们的值，都会拷贝到新对象上面。
```js
const {x, y, ...z} = {x: 1, y: 2, a: 3, b: 4};
x// 1
y// 2
z// {a: 3, b: 4}
```
上面代码中，变量`z`是解构赋值所在的对象。它获取等号右边的所有尚未读取的键（a和b），将它们连同值一起拷贝过来。

由于解构赋值要求等号右边是一个对象，所以如果等号右边是`undefined`或`null`，就会报错，因为它们无法转为对象。
```js
const {x, y, ...z} = undefined;// 报错
const {x, y, ...z} = null;// 报错
```

解构赋值必须是最后一个参数，否则会报错。
```js
const {...x, y, z} = obj;// 语法错误
const {x, ...y, ...z} = obj;// 语法错误
```

::: warning 注意
解构赋值的拷贝是浅拷贝，即如果一个键的值是复合类型的值（数组、对象、函数），那么解构赋值拷贝的是这个值的引用，而不是这个值的副本。
:::
例如：
```js
const obj = {a: {b: 1}};
const {...x} = obj;

obj.a.b = 2;
x.a.b// 2
```
上面代码中，`x`是解构赋值所在的对象，拷贝了对象`obj`的`a`属性。`a`属性引用了一个对象，修改这个对象的值，会影响到解构赋值对它的引用。

另外，扩展运算符的结构赋值，不能赋值继承自原型对象的属性。
```js
const o1 = {a: 1};
const o2 = {b: 2};
o2._proto_ = o1;

const {...o3} = o2;
o3// {b: 2}
o3.a// undefined
```
上面代码中，对象`o3`复制了`o2`，但是只复制了`o2`自身的属性，没有复制它的原型对象`o1`的属性。

解构赋值的一个用处，是扩展某个函数的参数，引入其他操作。
```js
function baseFunction({ a, b }) {
  // ...
}
function wrapperFunction({ x, y, ...restConfig }) {
  // 使用 x 和 y 参数进行操作
  // 其余参数传给原始函数
  return baseFunction(restConfig);
}
```
上面代码中，原始函数`baseFunction`接受`a`和`b`作为参数，函数`wrapperFunction`在`baseFunction`的基础上进行了扩展，能够接受多余的参数，并且保留原始函数的行为。

### 扩展运算符
对象的扩展运算符（`...`）用于取出对象中所有可遍历属性（不包括原型对象的属性），拷贝到当前对象中。
```js
const z = {a: 1, b: 2};
const n = {...z};
n// {a: 1, b: 2}
```

由于数组是特殊的对象，所以对象的扩展运算符也可以用于数组。
```js
const foo = {...['a', 'b', 'c']};
foo// {0: 'a', 1: 'b', 2: 'c'}
```
如果扩展运算符后面是一个空对象，则没有任何效果。
```js
{...{}, a: 1}
// {a: 1}
```

如果扩展运算符后面不是对象，则会自动将其转为对象。
```js
// 等同于 {...Object(1)}
{...1} // {}
```
上面代码中，扩展运算符后面是整数1，会自动转为数值的包装对象`Number{1}`。由于该对象没有自身属性，所以返回一个空对象。

下面的例子都是类似的道理。
```js
// 等同于 {...Object(true)}
{...true} // {}

// 等同于 {...Object(undefined)}
{...undefined} // {}

// 等同于 {...Object(null)}
{...null} // {}
```

但是，如果扩展运算符后面是字符串，它会自动转成一个类似数组的对象，因此返回的不是空对象。
```js
{...'hello'}
// {0: "h", 1: "e", 2: "l", 3: "l", 4: "o"}
```

扩展运算符可以用于合并两个对象。
```js
const ab = { ...a, ...b };
// 等同于
const ab = Object.assign({}, a, b);
```

如果用户自定义的属性，放在扩展运算符后面，则扩展运算符内部的同名属性会被覆盖掉。
```js
let aWithOverrides = { ...a, x: 1, y: 2 };
// 等同于
let aWithOverrides = { ...a, ...{ x: 1, y: 2 } };
// 等同于
let x = 1, y = 2, aWithOverrides = { ...a, x, y };
// 等同于
let aWithOverrides = Object.assign({}, a, { x: 1, y: 2 });
```
上面代码中，`a`对象的`x`属性和`y`属性，拷贝到新对象后会被覆盖掉。

如果把自定义属性放在扩展运算符前面，就变成了设置新对象的默认属性值。
```js
let aWithDefaults = { x: 1, y: 2, ...a };
// 等同于
let aWithDefaults = Object.assign({}, { x: 1, y: 2 }, a);
// 等同于
let aWithDefaults = Object.assign({ x: 1, y: 2 }, a);
```

与数组的扩展运算符一样，对象的扩展运算符后面可以跟表达式。
```js
const obj = {
  ...(x > 1 ? {a: 1} : {}),
  b: 2,
};
```

扩展运算符的参数对象之中，如果有取值函数`get`，这个函数是会执行的。
```js
// 并不会抛出错误，因为 x 属性只是被定义，但没执行
const aWithXGetter = {
  ...a,
  get x() {
    throw new Error('not throw yet');
  }
};

// 会抛出错误，因为 x 属性被执行了
const runtimeError = {
  ...a,
  ...{
    get x() {
      throw new Error('throw now');
    }
  }
};
```