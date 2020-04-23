# ES6 字符串的扩展
## 字符串的遍历接口
ES6 为字符串添加了遍历接口，使得字符串可以被`for...of`遍历循环：
```js
for (let codePoint of 'foo') {
  console.log(codePoint);
}
// "f"
// "o"
// "o"
```
除了遍历字符串，这个遍历器最大的优点是它可以识别`0xFFFF`码，传统的for循环无法识别这样的码点：
```js
let text = String.fromCodePoint(0x20BB7);

for (let i = 0; i < text.length; i++) {
  console.log(text[i]);
}
// " "
// " "

for (let i of text) {
  console.log(i);
}
// "𠮷"
```
上面代码中，字符串`text`只有一个字符，但是`for`循环会认为它包含两个字符（都不可打印），而`for...of`循环会正确识别出这一个字符。

## API拓展
### includes(), startsWith(), endsWith()
传统上，JavaScript只支持`indexOf`方法，用来查询某个字符串模式是否存在于目标字符串中。ES6 又提供了三种新方法。
* **includes** 返回布尔值，表示是否找到了参数字符串。
* **startsWith** 返回布尔值，表示模式是否存在于原字符串头部。
* **endsWith** 返回布尔值，表示模式是否存在于原字符串尾部。
```js
let s = 'Hello world!';

s.startsWith('Hello') // true
s.endsWith('!') // true
s.includes('o') // true
```
这三个方法都支持第二个参数，表示开始搜索的位置：
```js
let s = 'Hello world!';

s.startsWith('world', 6) // true
s.endsWith('Hello', 5) // true
s.includes('Hello', 6) // false
```
上面代码表示，使用第二个参数`n`时，`endsWith`的行为与其他两个方法有所不同。它针对前`n`个字符，而其他两个方法针对从第`n`个位置直到字符串结束。

### repeat()
`repeat`方法返回一个新字符串，表示将原字符串重复`n`次。如果参数是小数，会被取整。
```js
'x'.repeat(3) // "xxx"
'hello'.repeat(2) // "hellohello"
'na'.repeat(0) // ""
'na'.repeat(2.9) // "nana"
```
如果`repeat`的参数是负数或者`Infinity`，会报错。
```js
'na'.repeat(Infinity)
// RangeError
'na'.repeat(-1)
// RangeError
```
但是，如果参数是 0 到-1 之间的小数，则等同于 0，这是因为会先进行取整运算。0 到-1 之间的小数，取整以后等于`-0`，`repeat`视同为 0。参数`NaN`等同于 0。
```js
'na'.repeat(-0.9) // ""
```
如果`repeat`的参数是字符串，则会先尝试转换成数字。
```js
'na'.repeat('na') // ""
'na'.repeat('3') // "nanana"
```
### padStart(), padEnd()
ES2017新增了字符串长度补全功能。如果目标字符串未达到指定长度，则会在头部或尾部补全。`padStart`用于头部补全，`padEnd`用于尾部补全。
```js
'x'.padStart(5, 'ab') // 'ababx'
'x'.padStart(4, 'ab') // 'abax'

'x'.padEnd(5, 'ab') // 'xabab'
'x'.padEnd(4, 'ab') // 'xaba'
```
上面代码中，`padStart()`和`padEnd()`一共接受两个参数，第一个参数是字符串补全生效的最大长度，第二个参数是用来补全的字符串。

如果原字符串的长度，等于或大于最大长度，则字符串补全不生效，返回原字符串。
```js
'abcde'.padStart(3, 'fg');
// abcde
```

如果用来补全的字符串和原字符串的长度之和超过指定长度，则会截去超出长度的补全字符串：
```js
'abc'.padStart(10, '0123456789')
// '0123456abc'
```
如果省略第二个参数，默认使用空格补全长度。
```js
'x'.padStart(4) // '   x'
'x'.padEnd(4) // 'x   '
```
padStart()的常见用途是为数值补全指定位数，另一个是提示字符串格式。
```js
'1'.padStart(10, '0') // "0000000001"
'123456'.padStart(10, '0') // "0000123456"

'12'.padStart(10, 'YYYY-MM-DD') // "YYYY-MM-12"
'09-12'.padStart(10, 'YYYY-MM-DD') // "YYYY-09-12"
```

### raw()
ES6 还为原生的 `String` 对象，提供了一个`raw`方法。

`String.raw`方法，往往用来充当模板字符串的处理函数，返回一个斜杠都被转义（即斜杠前面再加一个斜杠）的字符串，对应于替换变量后的模板字符串。
```js
String.raw(Hi\n${2+3}!);
// 返回 "Hi\\n5!"

String.raw(Hi\u000A!);
// 返回 "Hi\\u000A!"

String.raw(Hi\\n)
// 返回 "Hi\\\\n"
```

## 模版字符串
模板字符串（template string）是增强版的字符串，用反引号（`）标识。它可以当作普通字符串使用，也可以用来定义多行字符串，或者在字符串中嵌入变量。
```js
// 普通字符串
`In JavaScript '\n' is a line-feed.`

// 多行字符串
`In JavaScript this is
 not legal.`

console.log(`string text line 1
string text line 2`);

// 字符串中嵌入变量
let name = "Bob", time = "today";
`Hello ${name}, how are you ${time}?`
```
在多行字符串中，所有模板字符串的空格和换行，都是被保留的，如果你不想要这个换行，可以使用`trim`方法消除它。
```js
console.log(`string text line 1
string text line 2`.trim());
```
模板字符串中嵌入变量，需要将变量名写在`${}`之中。
```js
let x = 1;
let y = 2;

`${x} + ${y} = ${x + y}`
// "1 + 2 = 3"

`${x} + ${y * 2} = ${x + y * 2}`
// "1 + 4 = 5"

let obj = {x: 1, y: 2};
`${obj.x + obj.y}`
// "3"
```
大括号内部可以放入任意的 JavaScript 语句，可以进行运算，以及引用对象属性。

模板字符串之中还能调用函数。
```js
function fn() {
  return "Hello World";
}

`foo ${fn()} bar`
// foo Hello World bar
```
如果模板字符串中的变量没有声明，将报错。
```js
// 变量place没有声明
let msg = `Hello, ${place}`;
// 报错
```

## 标签模版
模板字符串的功能，不仅仅是上面这些。它可以紧跟在一个函数名后面，该函数将被调用来处理这个模板字符串。这被称为“标签模板”功能（tagged template）。
```js
alert`123`
// 等同于
alert(123)
```
标签模板其实不是模板，而是函数调用的一种特殊形式。“标签”指的就是函数，紧跟在后面的模板字符串就是它的参数。

但是，如果模板字符里面有变量，就不是简单的调用了，而是会将模板字符串先处理成多个参数，再调用函数。
```js
let a = 5;
let b = 10;

tag`Hello ${ a + b } world ${ a * b }`;
// 等同于
tag(['Hello ', ' world ', ''], 15, 50);
```
### 标签模版的应用
“标签模板”的一个重要应用，就是过滤 HTML 字符串，防止用户输入恶意内容。
```js
let message =
  SaferHTML`<p>${sender} has sent you a message.</p>`;

function SaferHTML(templateData) {
  let s = templateData[0];
  for (let i = 1; i < arguments.length; i++) {
    let arg = String(arguments[i]);

    // Escape special characters in the substitution.
    s += arg.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    // Don't escape special characters in the template.
    s += templateData[i];
  }
  return s;
}
```
上面代码中，sender变量往往是用户提供的，经过SaferHTML函数处理，里面的特殊字符都会被转义。
```js
let sender = '<script>alert("abc")</script>'; // 恶意代码
let message = SaferHTML`<p>${sender} has sent you a message.</p>`;

message
// <p>&lt;script&gt;alert("abc")&lt;/script&gt; has sent you a message.</p>
```