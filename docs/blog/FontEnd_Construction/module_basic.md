# ES6 Module 基本语法

## 概述
在 ES6 之前，社区制定了一些模块加载方案，最主要的有 CommonJS 和 AMD 两种。前者用于服务器，后者用于浏览器。ES6 在语言标准的层面上，实现了模块功能，而且实现得相当简单，完全可以取代 CommonJS 和 AMD 规范，成为浏览器和服务器通用的模块解决方案。

ES6 模块的设计思想是尽量的静态化，使得**编译时**就能确定模块的依赖关系，以及输入和输出的变量。CommonJS 和 AMD 模块，都只能在**运行时**确定这些东西。比如，CommonJS 模块就是对象，输入时必须查找对象属性。
```js
// CommonJS模块
let { stat, exists, readFile } = require('fs');

// 等同于
let _fs = require('fs');
let stat = _fs.stat;
let exists = _fs.exists;
let readfile = _fs.readfile;
```

上面代码的实质是整体加载`fs`模块（即加载`fs`的所有方法），生成一个对象（`_fs`），然后再从这个对象上面读取 3 个方法。这种加载称为“*运行时加载*”，因为只有**运行时**才能得到这个对象，导致完全没办法在编译时做“静态优化”。

ES6 模块不是对象，而是通过`export`命令显式指定输出的代码，再通过`import`命令输入。
```js
// ES6模块
import { stat, exists, readFile } from 'fs';
```
上面代码的实质是从`fs`模块加载 3 个方法，其他方法不加载。这种加载称为“*编译时加载*”或者静态加载，即 ES6 可以在**编译时**就完成模块加载，效率要比 CommonJS 模块的加载方式高。当然，这也导致了**没法引用 ES6 模块本身**，因为它不是对象。

除了静态加载带来的各种好处，ES6 模块还有以下好处。

1. 不再需要UMD模块格式了，将来服务器和浏览器都会支持 ES6 模块格式。目前，通过各种工具库，其实已经做到了这一点。
2. 将来浏览器的新 API 就能用模块格式提供，不再必须做成全局变量或者navigator对象的属性。
3. 不再需要对象作为命名空间（比如Math对象），未来这些功能可以通过模块提供。

## 严格模式
ES6 模块内部自动开启严格模式，所以不需要显示调用`use strict`

严格模式从 ES5 开始就存在，它的主要限制有：

* 变量必须声明后再使用
* 函数的参数不能有同名属性，否则报错
* 不能使用`with`语句
* 不能对只读属性赋值，否则报错
* 不能使用前缀 0 表示八进制数，否则报错
* 不能删除不可删除的属性，否则报错
* 不能删除变量`delete prop`，会报错，只能删除属性`delete global[prop]`
* `eval`不会在它的外层作用域引入变量
* `eval`和`arguments`不能被重新赋值
* `arguments`不会自动反映函数参数的变化
* 不能使用`arguments.callee`
* 不能使用`arguments.caller`
* 禁止`this`指向全局对象
* 不能使用`fn.caller`和`fn.arguments`获取函数调用的堆栈
* 增加了保留字（比如`protected`、`static`和`interface`）

其中，尤其需要注意`this`的限制。ES6 模块之中，顶层的`this`指向`undefined`，即不应该在顶层代码使用`this`。

## export
模块功能主要由两个命令构成：`export`和`import`。`export`命令用于规定模块的*对外接口*，`import`命令用于*输入其他模块提供的功能*。

一个模块就是一个独立的文件。该文件内部的所有变量，**外部无法获取**。如果你希望外部能够读取模块内部的某个变量，就必须使用`export`关键字输出该变量。下面是一个 JS 文件，里面使用`export`命令输出变量。
```js
// profile.js
// 写法一
export var firstName = 'Michael';
export var lastName = 'Jackson';
export var year = 1958;

// 写法二
var firstName = 'Michael';
var lastName = 'Jackson';
var year = 1958;

export {firstName, lastName, year};
```
上面代码是`profile.js`文件，保存了用户信息。ES6 将其视为一个模块，里面用`export`命令对外部输出了三个变量。
应该优先考虑使用第二种写法。因为这样就可以在脚本尾部，一眼看清楚输出了哪些变量。

`export`命令除了输出变量，还可以输出函数或类（class）。
```js
export function multiply(x, y) {
  return x * y;
};
```

通常情况下，`export`输出的变量就是本来的名字，但是可以使用`as`关键字重命名。
```js
function v1() { ... }
function v2() { ... }

export {
  v1 as streamV1,
  v2 as streamV2,
  v2 as streamLatestVersion
};
```
上面代码使用`as`关键字，重命名了函数`v1`和`v2`的对外接口。重命名后，`v2`可以用不同的名字输出两次。

### 对外接口
需要特别注意的是，`export`命令规定的是**对外的接口**，必须与模块内部的变量建立一一对应关系。
```js
// 报错
export 1;

// 报错
var m = 1;
export m;
```
上面两个写法均会报错，因为它们都是直接或间接地对外输出了常量，而不是接口。

输出接口，有两种写法：
1. 在`export`关键字后先跟变量或函数声明的关键字，再写变量或函数。
2. 提前声明了变量，`export`后就要在大括号内写变量或函数名。

例如：
```js
// 变量
// 写法一
export var m = 1;

// 写法二
var m = 1;
export {m};

// 写法三
var n = 1;
export {n as m};

// 函数
// 报错
function f() {}
export f;

// 正确
export function f() {};

// 正确
function f() {}
export {f};
```

### 注意
另外，`export`语句输出的接口，与其对应的值是动态绑定关系，即通过该接口，可以取到模块内部**实时**的值。
```js
export var foo = 'bar';
setTimeout(() => foo = 'baz', 500);
```
上面代码输出变量`foo`，值为`bar`，500 毫秒之后变成`baz`。

这一点与 CommonJS 规范完全不同。CommonJS 模块输出的是值的缓存，不存在动态更新。

最后，`export`命令可以出现在模块的任何位置，只要处于模块顶层就可以。如果处于块级作用域内，就会报错，下一节的`import`命令也是如此。这是因为处于条件代码块之中，就没法做静态优化了，违背了 ES6 模块的设计初衷。
```js
function foo() {
  export default 'bar' // SyntaxError
}
foo()
```

## import
使用`export`命令定义了模块的对外接口以后，其他 JS 文件就可以通过`import`命令加载这个模块。
```js
// main.js
import {firstName, lastName, year} from './profile.js';

function setName(element) {
  element.textContent = firstName + ' ' + lastName;
}
```
上面代码的`import`命令，用于加载`profile.js`文件，并从中输入变量。`import`命令接受一对大括号，里面指定要从其他模块导入的变量名。大括号里面的变量名，必须与被导入模块（profile.js）对外接口的名称相同。

如果想为输入的变量重新取一个名字，`import`命令要使用`as`关键字，将输入的变量重命名。
```js
import { lastName as surname } from './profile.js';
```

`import`命令输入的**变量都是只读的**，因为它的本质是*输入接口*。也就是说，不允许在加载模块的脚本里面，改写接口。
```js
import {a} from './xxx.js'

a = {}; // Syntax Error : 'a' is read-only;
```
上面代码中，脚本加载了变量`a`，对其重新赋值就会报错，因为`a`是一个只读的接口。但是，如果`a`是一个对象，改写`a`的属性是允许的。
```js
import {a} from './xxx.js'

a.foo = 'hello'; // 合法操作
```

`import`后面的`from`指定模块文件的位置，可以是相对路径，也可以是绝对路径，`.js`后缀可以省略。如果只是模块名，不带有路径，那么必须有配置文件，告诉 JavaScript 引擎该模块的位置。

::: warning 注意
`import`命令具有提升效果，会提升到整个模块的头部，首先执行。
:::
例如：
```js
foo();

import { foo } from 'my_module';
```
上面的代码不会报错，因为`import`的执行早于`foo`的调用。这种行为的本质是，`import`命令是**编译阶段执行**的，在代码运行之前。

由于`import`是静态执行，所以不能使用表达式和变量，这些只有在*运行时才能得到结果*的语法结构。
```js
// 报错
import { 'f' + 'oo' } from 'my_module';

// 报错
let module = 'my_module';
import { foo } from module;

// 报错
if (x === 1) {
  import { foo } from 'module1';
} else {
  import { foo } from 'module2';
}
```
上面三种写法都会报错，因为它们用到了表达式、变量和`if`结构。在静态分析阶段，这些语法都是没法得到值的。

最后，`import`语句会执行所加载的模块，因此可以有下面的写法。
```js
import 'lodash';
```
上面代码仅仅执行`lodash`模块，但是不输入任何值。

如果多次重复执行同一句`import`语句，那么只会执行一次，而不会执行多次。

## 模块的整体加载
除了指定加载某个输出值，还可以使用整体加载，即用星号（`*`）指定一个对象，所有输出值都加载在这个对象上面。
```js
// person.js
var firstName = 'Michael';
var lastName = 'Jackson';
var year = 1958;

export {firstName, lastName, year};

// 导入
import { * as person} from './person';

person.firstName// 'Michael'
person.lastName// 'Jackson'
person.year// 1958
```

::: warning 注意
模块整体加载所在的那个对象（上例是person），应该是可以静态分析的，所以**不允许运行时改变**。
:::
例如：
```js
import { * as person} from './person';

person.firstName = 'somebody';// 不允许这种写法
```

## export default
从前面的例子可以看出，使用`import`命令的时候，用户需要知道所要加载的变量名或函数名，否则无法加载。

为了给用户提供方便，让他们不用阅读文档就能加载模块，就要用到`export default`命令，为模块指定默认输出。
```js
// export-default.js
export default function () {
  console.log('foo');
}
```
上面代码是一个模块文件`export-default.js`，它的默认输出是一个函数。

其他模块加载该模块时，`import`命令可以为该匿名函数指定任意名字。
```js
// import-default.js
import customName from './export-default';
customName(); // 'foo'
```
上面代码的`import`命令，可以用任意名称指向`export-default.js`输出的方法，这时就不需要知道原模块输出的函数名。需要注意的是，这时`import`命令后面，**不使用大括号**。

`export default`命令用在非匿名函数前，也是可以的。
```js
// export-default.js
export default function foo() {
  console.log('foo');
}

// 或者写成

function foo() {
  console.log('foo');
}

export default foo;
```
上面代码中，`foo`函数的函数名`foo`，在模块外部是无效的。加载的时候，视同匿名函数加载。

### 比较
下面比较一下默认输出和正常输出。
```js
// 第一组
export default function crc32() { // 输出
  // ...
}

import crc32 from 'crc32'; // 输入

// 第二组
export function crc32() { // 输出
  // ...
};

import {crc32} from 'crc32'; // 输入
```
上面代码的两组写法，第一组是使用`export default`时，对应的`import`语句不需要使用大括号；第二组是不使用`export default`时，对应的`import`语句需要使用大括号。

`export default`命令用于指定模块的默认输出。显然，一个模块只能有一个默认输出，因此`export default`命令只能使用一次。所以，`import`命令后面才不用加大括号，因为只可能唯一对应`export default`命令。

### 实质
本质上，`export default`就是输出一个叫做`default`的变量或方法，然后系统允许你为它取任意名字。所以，下面的写法是有效的。
```js
// modules.js
function add(x, y) {
  return x * y;
}
export {add as default};
// 等同于
// export default add;

// app.js
import { default as foo } from 'modules';
// 等同于
// import foo from 'modules';
```
正是因为`export default`命令其实只是输出一个叫做`default`的变量，所以它后面不能跟变量声明语句。

同样地，因为`export default`命令的本质是将后面的值，赋给`default`变量，所以可以直接将一个值写在`export default`之后。
```js
// 正确
export default 42;

// 报错
export 42;
```

有了`export default`命令，输入模块时就非常直观了。如果想在一条`import`语句中，同时输入默认方法和其他接口，可以写成下面这样。
```js
// lodash.js
export default function (obj) {
  // ···
}

export function each(obj, iterator, context) {
  // ···
}

export { each as forEach };

// import.js
import lodash, { each, forEach } from 'lodash';
```

`export default`也可以用来输出类。
```js
// MyClass.js
export default class { ... }

// main.js
import MyClass from 'MyClass';
let o = new MyClass();
```

## export 与 import 的复合写法
如果在一个模块之中，先输入后输出同一个模块，`import`语句可以与`export`语句写在一起。
```js
export { foo, bar } from 'my_module';

// 可以简单理解为
import { foo, bar } from 'my_module';
export { foo, bar };
```
上面代码中，`export`和`import`语句可以结合在一起，写成一行。但需要注意的是，写成一行以后，`foo`和`bar`实际上并**没有被导入当前模块**，只是相当于**对外转发**了这两个接口，导致当前模块**不能直接使用**`foo`和`bar`。

模块的接口改名和整体输出，也可以采用这种写法。
```js
// 接口改名
export { foo as myFoo } from 'my_module';

// 整体输出
export * from 'my_module';
```

默认接口的写法如下。
```js
export { default } from 'foo';
```