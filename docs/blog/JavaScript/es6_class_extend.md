# ES6 Class 的继承

## 简介
ES6 允许 Class 通过`extends`关键字实现继承，这比 ES5 通过修改原型链实现继承要更加清晰。
```js
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  toString() {
    return `(${this.x}, ${this.y})`;
  }
}

class colorPoint extends Point {
  constructor(x, y, color) {
    super(x, y);
    this.color = color;
  }

  toString() {
    return `${this.color} ${super.toString()}`;
  }
}
```
上面代码定义了一个`ColorPoint`类，该类通过`extends`关键字，继承了`Point`类的所有属性和方法。

其中，`constructor`方法和`toString`方法之中，都出现了`super`关键字，它在这里表示父类的构造函数，用来新建父类的`this`对象。

子类必须在`constructor`方法中调用`super`方法，否则新建实例时会报错。这是因为子类自己的`this`对象，必须先通过父类的构造函数完成塑造，得到与父类同样的实例属性和方法，然后再对其进行加工，加上子类自己的实例属性和方法。如果不调用`super`方法，子类就得不到`this`对象。

```js
class Point { /* ... */ }

class ColorPoint extends Point {
  constructor() {
  }
}

let cp = new ColorPoint(); // ReferenceError
```
上面代码中，`ColorPoint`继承了父类`Point`，但是它的构造函数没有调用`super`方法，导致新建实例时报错。

### 区别
ES6 继承机制的实质，是先将父类实例对象的属性和方法，添加到子类的`this`上（所以必须先调用`super`方法），然后通过子类的构造函数修改`this`。

而 ES5 的继承，是先创建子类的`this`，再在其构造函数内调用父类的构造函数（`Parent.apply(this)`），从而将父类的方法添加到子类`this`上。

### 注意
在子类的构造函数中，只有调用`super`之后，才可以使用`this`关键字，否则会报错。这是因为子类实例的构建，基于父类实例，只有`super`方法才能调用父类实例。
```js
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class ColorPoint extends Point {
  constructor(x, y, color) {
    this.color = color; // ReferenceError
    super(x, y);
    this.color = color; // 正确
  }
}
```
上面代码中，子类的`constructor`方法没有调用`super`之前，就使用`this`关键字，结果报错，而放在`super`方法之后就是正确的。

与 ES5 一致，创建的实例同时是子类和父类的实例
```js
let cp = new ColorPoint(25, 8, 'green');

cp instanceof ColorPoint // true
cp instanceof Point // true
```

最后，父类的静态方法也会被子类继承。
```js
class A {
  static hello() {
    console.log('hello world');
  }
}

class B extends A {
}

B.hello()  // hello world
```

## Object.getPrototypeOf()
`Object.getPrototypeOf`方法可以用来从子类上获取父类。
```js
Object.getPrototypeOf(ColorPoint) === Point
// true
```
因此，可以使用这个方法判断，一个类是否继承了另一个类。

## super关键字
`super`这个关键字，既可以当作函数使用，也可以当作对象使用。在这两种情况下，它的用法完全不同。

### 作为函数使用
第一种情况，`super`作为函数调用时，代表父类的构造函数。ES6 要求，子类的构造函数必须执行一次`super`函数。其次，作为函数时，`super()`只能用在子类的构造函数之中，用在其他地方就会造成句法错误。
```js
class A {}

class B extends A {
  constructor() {
    super();
  }
}
```
上面代码中，子类B的构造函数之中的`super()`，代表调用父类的构造函数。这是必须的，否则 JavaScript 引擎会报错。

::: warning 注意
`super`虽然代表了父类A的构造函数，但是返回的是子类B的实例，即`super`内部的`this`指的是B，因此`super()`在这里相当于`A.prototype.constructor.call(this)`。
:::
例如：
```js
class A {
  constructor() {
    console.log(new.target.name);
  }
}
class B extends A {
  constructor() {
    super();
  }
}
new A() // A
new B() // B
```
上面代码中，`new.target`指向当前正在执行的函数。可以看到，在`super()`执行时，它指向的是子类B的构造函数，而不是父类A的构造函数。也就是说，`super()`内部的`this`指向的是B。

### 作为对象
`super`作为对象时，在普通方法中，指向父类的**原型对象**，并且，通过`super`调用父类原型的方法时，方法内部的`this`指向**当前的子类实例**；在静态方法中，`super`指向**父类**，并且，调用的父类方法内部的`this`指向**当前的子类**，而不是子类的实例。
```js
class A {
  constructor() {
    this.x = 1;
  }
  print() {
    console.log(this.x);
  }
  static myMethod() {
    console.log('static', this.x);
  }
}

class B extends A {
  constructor() {
    super();
    this.x = 2;
  }
  m() {
    super.print();
  }
  static myMethod() {
    super.myMethod();
  }
}

let b = new B();

B.x = 3;
B.myMethod()// 'static 3'
b.m() // 2
```
上面代码中，子类B当中的`super.print()`，就是将`super`当作一个对象使用。这时，`super`在普通方法之中，指向`A.prototype`，即父类的原型对象，所以`super.print()`就相当于`A.prototype.print()`，并且，方法内部的`this`指向当前的子类实例。

在子类B的静态方法`myMethod`中，`super`指向父类A，所以`B.myMethod()`相当于`A.myMethod()`。

::: warning 注意
使用`super`的时候，必须显式指定是作为函数、还是作为对象使用，否则会报错。
:::
例如：
```js
class A {}

class B extends A {
  constructor() {
    super();
    console.log(super); // 报错
  }
}
```
上面代码中，`console.log(super)`当中的`super`，无法看出是作为函数使用，还是作为对象使用，所以 JavaScript 引擎解析代码的时候就会报错。这时，如果能清晰地表明`super`的数据类型，就不会报错。

最后，由于对象总是继承其他对象的，所以可以在任意一个对象中，使用`super`关键字。
```js
var obj = {
  toString() {
    return "MyObject: " + super.toString();
  }
};

obj.toString(); // MyObject: [object Object]
```

## 类的 prototype 属性和__proto__属性
大多数浏览器的 ES5 实现之中，每一个对象都有`__proto__`属性，指向对应的构造函数的`prototype`属性。Class 作为构造函数的语法糖，同时有`prototype`属性和`__proto__`属性，因此同时存在两条继承链。

（1）子类的`__proto__`属性，表示构造函数的继承，总是指向父类。

（2）子类`prototype`属性的`__proto__`属性，表示方法的继承，总是指向父类的`prototype`属性。
```js
class A {
}

class B extends A {
}

B.__proto__ === A // true
B.prototype.__proto__ === A.prototype // true
```
上面代码中，子类B的`__proto__`属性指向父类A，子类B的`prototype`属性的`__proto__`属性指向父类A的`prototype`属性。

这样的结果是因为，类的继承是按照下面的模式实现的。
```js
class A {
}

class B {
}

// B 的实例继承 A 的实例
Object.setPrototypeOf(B.prototype, A.prototype);

// B 继承 A 的静态属性
Object.setPrototypeOf(B, A);

const b = new B();
```
因此，就得到了上面的结果。
```js
Object.setPrototypeOf(B.prototype, A.prototype);
// 等同于
B.prototype.__proto__ = A.prototype;

Object.setPrototypeOf(B, A);
// 等同于
B.__proto__ = A;
```
这两条继承链，可以这样理解：作为一个对象，子类（`B`）的原型（`__proto__`属性）是父类（`A`）；作为一个构造函数，子类（`B`）的原型对象（`prototype`属性）是父类的原型对象（`prototype`属性）的实例。


子类实例的`__proto__`属性的`__proto__`属性，指向父类实例的`__proto__`属性。也就是说，子类的原型的原型，是父类的原型。

### 子类继承Object类
这种情况下，A其实就是构造函数`Object`的复制，A的实例就是`Object`的实例。
```js
class A extends Object {
}

A.__proto__ === Object // true
A.prototype.__proto__ === Object.prototype // true
```

### 不存在任何继承
这种情况下，A作为一个基类（即不存在任何继承），就是一个普通函数，所以直接继承`Function.prototype`。但是，A调用后返回一个空对象（即`Object`实例），所以`A.prototype.__proto__`指向构造函数（`Object`）的`prototype`属性。

## 原生构造函数的继承
ES5 的继承是先新建子类的实例对象`this`，再将父类的属性添加到子类上，由于父类的内部属性无法获取，导致**无法**继承原生的构造函数。比如，`Array`构造函数有一个内部属性[[DefineOwnProperty]]，用来定义新属性时，更新`length`属性，这个内部属性无法在子类获取，导致子类的`length`属性行为不正常。

ES6 允许继承原生构造函数定义子类，因为 ES6 是先新建父类的实例对象`this`，然后再用子类的构造函数修饰`this`，使得父类的所有行为都可以继承。下面是一个继承`Array`的例子。
```js
class MyArray extends Array {
  constructor(...args) {
    super(...args);
  }
}

var arr = new MyArray();
arr[0] = 12;
arr.length // 1

arr.length = 0;
arr[0] // undefined
```
上面代码定义了一个`MyArray`类，继承了`Array`构造函数，因此就可以从`MyArray`生成数组的实例。这意味着，ES6 可以自定义原生数据结构（比如`Array`、`String`等）的子类，这是 ES5 无法做到的。

注意，继承`Object`的子类，有一个[行为差异](https://stackoverflow.com/questions/36203614/super-does-not-pass-arguments-when-instantiating-a-class-extended-from-object)
```js
class NewObj extends Object{
  constructor(){
    super(...arguments);
  }
}
var o = new NewObj({attr: true});
o.attr === true  // false
```
上面代码中，`NewObj`继承了`Object`，但是无法通过`super`方法向父类`Object`传参。这是因为 ES6 改变了`Object`构造函数的行为，一旦发现`Object`方法不是通过`new Object()`这种形式调用，ES6 规定`Object`构造函数会忽略参数。