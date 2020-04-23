# ES6 Class基本语法

## 简介
### 类的由来
JavaScript 语言中，生成实例对象的传统方法是通过构造函数。下面是一个例子。
```js
function Point(x, y) {
  this.x = x;
  this.y = y;
}

Point.prototype.toString = function () {
  return '(' + this.x + ', ' + this.y + ')';
};

var p = new Point(1, 2);
```
ES6 提供了更接近传统语言的写法，引入了 Class（类）这个概念，作为对象的模板。通过`class`关键字，可以定义类。

基本上，ES6 的`class`可以看作只是一个语法糖，它的绝大部分功能，ES5 都可以做到，新的`class`写法只是让对象原型的写法更加清晰、更像面向对象编程的语法而已。上面的代码用 ES6 的`class`改写，就是下面这样。
```js
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  toString() {
    return '(' + this.x + ', ' + this.y + ')';
  }
}
```
上面代码定义了一个“类”，可以看到里面有一个`constructor`方法，这就是构造方法，而`this`关键字则代表实例对象。也就是说，ES5 的构造函数`Point`，对应 ES6 的`Point`类的构造方法。

`Point`类除了构造方法，还定义了一个`toString`方法。注意，定义“类”的方法的时候，前面不需要加上`function`这个关键字，直接把函数定义放进去了就可以了。另外，方法之间不需要逗号分隔，加了会报错。

`prototype`对象的`constructor`属性，直接指向“类”的本身，这与 ES5 的行为是一致的。
```js
class Point {
  // ...
}

typeof Point // "function"
Point === Point.prototype.constructor // true
```
上面代码表明，类的数据类型就是函数，类本身就指向构造函数。


使用的时候，也是直接对类使用`new`命令，跟构造函数的用法完全一致。
```js
class Bar {
  doStuff() {
    console.log('stuff');
  }
}

var b = new Bar();
b.doStuff() // "stuff"
```

构造函数的`prototype`属性，在 ES6 的“类”上面继续存在。事实上，类的所有方法都定义在类的`prototype`属性上面。
```js
class Point {
  constructor() {
    // ...
  }

  toString() {
    // ...
  }

  toValue() {
    // ...
  }
}

// 等同于
Object.assign(Point.prototype, {
  constructor(){},
  toString(){},
  toValue(){}
});
```
在类的实例上面调用方法，其实就是调用原型上的方法。
```js
class B {}
let b = new B();

b.constructor === B.prototype.constructor // true
```
上面代码中，b是B类的实例，它的`constructor`方法就是B类原型的`constructor`方法。

另外，类的内部所有定义的方法，都是不可枚举的（non-enumerable）。
```js
class Point {
  constructor(x, y) {
    // ...
  }

  toString() {
    // ...
  }
}

Object.keys(Point.prototype)
// []
Object.getOwnPropertyNames(Point.prototype)
// ["constructor","toString"]
```
上面代码中，`toString`方法是`Point`类内部定义的方法，它是不可枚举的。这一点与 ES5 的行为不一致。
```js
var Point = function (x, y) {
  // ...
};

Point.prototype.toString = function() {
  // ...
};

Object.keys(Point.prototype)
// ["toString"]
Object.getOwnPropertyNames(Point.prototype)
// ["constructor","toString"]
```
上面代码采用 ES5 的写法，`toString`方法就是可枚举的。

### constructor 方法
`constructor`方法是类的默认方法，通过new命令生成对象实例时，自动调用该方法。一个类必须有`constructor`方法，如果没有显式定义，一个空的`constructor`方法会被默认添加。
```js
class Point {
}

// 等同于
class Point {
  constructor() {}
}
```

`constructor`方法默认返回实例对象（即`this`），完全可以指定返回另外一个对象。
```js
class Foo {
  constructor() {
    return Object.create(null);
  }
}

new Foo() instanceof Foo
// false
```
上面代码中，`constructor`函数返回一个全新的对象，结果导致实例对象不是`Foo`类的实例。

类必须使用`new`调用，否则会报错。这是它跟普通构造函数的一个主要区别，后者不用`new`也可以执行。
```js
class Foo {
  constructor() {
    return Object.create(null);
  }
}

Foo()
// TypeError: Class constructor Foo cannot be invoked without 'new'
```

### 类的实例
生成类的实例的写法，与 ES5 完全一样，也是使用`new`命令。前面说过，如果忘记加上`new`，像函数那样调用`Class`，将会报错。
```js
class Point {
  // ...
}

// 报错
var point = Point(2, 3);

// 正确
var point = new Point(2, 3);
```

与 ES5 一样，实例的属性除非显式定义在其本身（即定义在`this`对象上），否则都是定义在原型上（即定义在`class`上）。
```js
//定义类
class Point {

  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  toString() {
    return '(' + this.x + ', ' + this.y + ')';
  }

}

var point = new Point(2, 3);

point.toString() // (2, 3)

point.hasOwnProperty('x') // true
point.hasOwnProperty('y') // true
point.hasOwnProperty('toString') // false
point.__proto__.hasOwnProperty('toString') // true
```
上面代码中，x和y都是实例对象`point`自身的属性（因为定义在`this`变量上），所以`hasOwnProperty`方法返回`true`，而`toString`是原型对象的属性（因为定义在`Point`类上），所以`hasOwnProperty`方法返回`false`。这些都与 ES5 的行为保持一致。

与 ES5 一样，类的所有实例共享一个原型对象。
```js
var p1 = new Point(2,3);
var p2 = new Point(3,2);

p1.__proto__ === p2.__proto__
//true
```
上面代码中，p1和p2都是`Point`的实例，它们的原型都是`Point.prototype`，所以`__proto__`属性是相等的。

### 取值函数（getter）和存值函数（setter）
与 ES5 一样，在“类”的内部可以使用`get`和`set`关键字，对某个属性设置存值函数和取值函数，拦截该属性的存取行为。
```js
class MyClass {
  constructor() {
    // ...
  }
  get prop() {
    return 'getter';
  }
  set prop(value) {
    console.log('setter: '+value);
  }
}

let inst = new MyClass();

inst.prop = 123;
// setter: 123

inst.prop
// 'getter'
```
上面代码中，`prop`属性有对应的存值函数和取值函数，因此赋值和读取行为都被自定义了。

### 属性表达式
类的属性名，可以采用表达式。
```js
let methodName = 'getArea';

class Square {
  constructor(length) {
    // ...
  }

  [methodName]() {
    // ...
  }
}
```
上面代码中，`Square`类的方法`getArea`是从表达式得到的。

### Class表达式
与函数一样，类也可以使用语句的形式定义。
```js
const MyClass = class Me {
  getClassName() {
    return Me.name;
  }
};
```
上面代码使用表达式定义了一个类。需要注意的是，这个类的名字是`MyClass`而不是`Me`，`Me`只在 Class 的内部代码可用，指代当前类。
```js
let inst = new MyClass();
inst.getClassName() // Me
Me.name // ReferenceError: Me is not defined
```
上面代码表示，`Me`只在 Class 内部有定义。

如果类的内部没用到的话，可以省略`Me`，也就是可以写成下面的形式。
```js
const MyClass = class { /* ... */ };
```
采用 Class 表达式，可以写出立即执行的 Class。
```js
let person = new class {
  constructor(name) {
    this.name = name;
  }

  sayName() {
    console.log(this.name);
  }
}('张三');

person.sayName(); // "张三"
```

### 注意点
#### 1. 严格模式
类和模块的内部，默认就是严格模式，所以不需要使用`use strict`指定运行模式。只要你的代码写在类或模块之中，就只有严格模式可用。考虑到未来所有的代码，其实都是运行在模块之中，所以 ES6 实际上把整个语言升级到了严格模式。

#### 2. 不存在变量提升
类不存在变量提升（hoist），这一点与 ES5 完全不同。
```js
new Foo(); // ReferenceError
class Foo {}
```
上面代码中，`Foo`类使用在前，定义在后，这样会报错，因为 ES6 不会把类的声明提升到代码头部。这种规定的原因与下文要提到的继承有关，必须保证子类在父类之后定义。
```js
{
  let Foo = class {};
  class Bar extends Foo {
  }
}
```
上面的代码不会报错，因为`Bar`继承`Foo`的时候，`Foo`已经有定义了。但是，如果存在`class`的提升，上面代码就会报错，因为`class`会被提升到代码头部，而`let`命令是不提升的，所以导致`Bar`继承`Foo`的时候，`Foo`还没有定义。

#### 3. name 属性
由于本质上，ES6 的类只是 ES5 的构造函数的一层包装，所以函数的许多特性都被`Class`继承，包括`name`属性。
```js
class Point {}
Point.name // "Point"
```

#### 4. this 的指向
类的方法内部如果含有`this`，它默认指向类的实例。但是，必须非常小心，一旦单独使用该方法，很可能报错。
```js
class Logger {
  printName(name = 'there') {
    this.print(`Hello ${name}`);
  }

  print(text) {
    console.log(text);
  }
}

const logger = new Logger();
const { printName } = logger;
printName(); // TypeError: Cannot read property 'print' of undefined
```
上面代码中，printName方法中的`this`，默认指向Logger类的实例。但是，如果将这个方法提取出来单独使用，`this`会指向该方法运行时所在的环境，因为找不到`print`方法而导致报错。

这种情况在我们使用 React 进行开发时是十分常见的。

例如：我们要在一个 Button 上绑定组件内部的方法，但这时该方法内部的`this`是指向这个 Button 的。
```js {16}
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      message: 'Hello World!'
    };
  }

  handleClick() {
    console.log(this.state.message);
  }

  render() {
    return (
      <div>
        <button onClick={this.handleClick}></button>
      </div>
    )
  }
}
```
这时，当我们点击 Button 时只会输出`undefined`，这就是因为提取并单独使用`class`内部方法，而方法的`this`会指向运行时的实例，也就是 Button 。

一个比较简单的解决方法是，在构造方法中绑定`this`，这样就可以得到正确的指向了。
```js {8}
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      message: 'Hello World!'
    };
    // 方法1
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    console.log(this.state.message);
  }
  
  render() {
    return (
      <div>
        <button onClick={this.handleClick.bind(this)/* 方法二 */}></button>
      </div>
    )
  }
}
```

## 静态方法
类相当于实例的原型，所有在类中定义的方法，都会被实例继承。如果在一个方法前，加上`static`关键字，就表示该方法不会被实例继承，而是直接通过类来调用，这就称为“静态方法”。
```js
class Foo {
  static classMethod() {
    return 'hello';
  }
}

Foo.classMethod() // 'hello'

var foo = new Foo();
foo.classMethod()
// TypeError: foo.classMethod is not a function
```
上面代码中，Foo 类的`classMethod`方法前有`static`关键字，表明该方法是一个静态方法，可以直接在 Foo 类上调用（`Foo.classMethod()`），而不是在 Foo 类的实例上调用。如果在实例上调用静态方法，会抛出一个错误，表示不存在该方法。

::: warning 注意
如果静态方法包含`this`关键字，这个`this`指的是类，而不是实例。
:::
例如：
```js
class Foo {
  static bar() {
    this.baz();
  }
  static baz() {
    console.log('hello');
  }
  baz() {
    console.log('world');
  }
}

Foo.bar() // hello
```
上面代码中，静态方法`bar`调用了`this.baz`，这里的`this`指的是 Foo 类，而不是 Foo 的实例，等同于调用`Foo.baz`。另外，从这个例子还可以看出，静态方法可以与非静态方法重名。

父类的静态方法，可以被子类继承。
```js
class Foo {
  static classMethod() {
    return 'hello';
  }
}

class Bar extends Foo {
}

Bar.classMethod() // 'hello'
```
上面代码中，父类 Foo 有一个静态方法，子类 Bar 可以调用这个方法。

静态方法也是可以从`super`对象上调用的。
```js
class Foo {
  static classMethod() {
    return 'hello';
  }
}

class Bar extends Foo {
  static classMethod() {
    return super.classMethod() + ', too';
  }
}

Bar.classMethod() // "hello, too"
```
## 静态属性
ES6中的`static`只能修饰`class`的方法，而不能修饰属性，所以在`class`中，属性只有两种方式：
```js
let sex = 0
class MyClass {
    constructor({name, age}) {
        this.name = name
        this.age = age
    }
    get sex() {
        return sex
    }
    set sex(value) {
        sex = value
    }
}
```
上面有两种属性的配置方式，一种是在`constructor`中使用`.`操作符，另一种则是通过`get`, `set`来定义属性。如果只有`get sex`而没有`set sex`，那么`sex`属性是不能被修改的。但是问题是，这两种方法都不是定义一个静态属性，静态属性是不需要实例化的，也就是说可以直接`MyClass.sex`这样获取。目前已知可用的方式如下：
```js
class MyClass {
    static get sex() {}
    static set sex() {}
}
```
也就是再`get`, `set`前面加`static`。这样就可以直接使用`MyClass.sex`的方法获取或动态设置其值，而无需实例化。

## 实例属性的新写法
实例属性除了定义在`constructor()`方法里面的`this`上面，也可以定义在类的最顶层。
```js
class IncreasingCounter {
  _count = 0;
  get value() {
    console.log('Getting the current value!');
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```
上面代码中，实例属性`_count`与取值函数`value()`和`increment()`方法，处于同一个层级。这时，不需要在实例属性前面加上`this`。

## new.target属性
`new`是从构造函数生成实例对象的命令。ES6 为`new`命令引入了一个`new`.target属性，该属性一般用在构造函数之中，返回`new`命令作用于的那个构造函数。如果构造函数不是通过`new`命令调用的，`new.target`会返回`undefined`，因此这个属性可以用来确定构造函数是怎么调用的。
```js
function Person(name) {
  if (new.target === Person) {
    this.name = name;
  } else {
    throw new Error('必须使用 new 命令生成实例');
  }
}

var person = new Person('张三'); // 正确
var notAPerson = Person.call(person, '张三');  // 报错
```
上面代码确保构造函数只能通过`new`命令调用。

Class 内部调用`new.target`，返回当前 Class。
```js
class Rectangle {
  constructor(length, width) {
    console.log(new.target === Rectangle);
    this.length = length;
    this.width = width;
  }
}

var obj = new Rectangle(3, 4); // 输出 true
```
需要注意的是，子类继承父类时，`new.target`会返回子类。
```js
class Rectangle {
  constructor(length, width) {
    console.log(new.target === Rectangle);
    // ...
  }
}

class Square extends Rectangle {
  constructor(length) {
    super(length, length);
  }
}

var obj = new Square(3); // 输出 false
```
注意，在函数外部，使用`new.target`会报错。