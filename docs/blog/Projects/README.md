# 数独游戏
最近玩起了数独，突然也想实现一个自己的数独游戏。[Github](https://github.com/Styx11/Sudoku)
> 规则：玩家需要根据9×9盘面上的已知数字，推理出所有剩余空格的数字，并满足每一行、每一列、每一个粗线宫（3*3）内的数字均含1-9，不重复。目前已知的数独终盘约有6.67×10的21次方种组合，2005年由Bertram Felgenhauer和Frazer Jarvis计算出该数字

![数独九宫格](https://timgsa.baidu.com/timg?image&quality=80&size=b9999_10000&sec=1540126546791&di=96a48e3d7fc70ea11195978a1d25b292&imgtype=0&src=http%3A%2F%2Fimg.mp.itc.cn%2Fupload%2F20170705%2F48a36dcb0de24adb97d091756ab52aab_th.jpg)

由规则我们知道数独九宫格中的数字填写是要依照一定的**不重复**原则，也就是该数字在其所在行、列、宫都是唯一的，并且一个数独九宫格只有**唯一解**，不存在多解的歧义。建立一个终盘涉及到随机数的获取、数字的验证与填写，那么首先我们的思路就应该是 ***获取随机数->*** ***建立9×9宫格->*** ***不断验证并将随机数填入->*** ***按难度扣去一定数字->*** ***解题验证***

*下面依照这个思路一步步说明*

## Fisher-Yates洗牌算法
Fisher–Yates洗牌算法也被称做高纳德置乱算法，通俗说就是生成一个有限集合的随机排列。Fisher-Yates洗牌算法是无偏的，所以每个排列都是等可能的，当前使用的Fisher-Yates随机置乱算法是相当有效的，需要的时间正比于要随机置乱的数，不需要额为的存储空间开销。

简单来说 Fisher–Yates 洗牌算法是一个用来将一个有限集合生成一个随机排列的算法（数组随机排序）。这个算法生成的随机排列是等概率的。同时这个算法非常高效。

### 算法步骤
1. 定义一个数组（shuffled），长度（length）是原数组（arr）长度
2. 取 0 到 index (初始0) 随机值 rand, 赋值shuffled[index] = shuffled[rand], shuffled[rand] = arr[index]
3. index++ ; 重复第二步，直到 index = length -1


简单来说，就是 shuffled 从 0 到 length-1 取随机序号进行赋值的过程，并且新加入的值是 arr[index]。

### 实现
``` js
// 取min到max区间内的随机数
Grid.prototype.randomIndex = function (min, max) {
  if (!max) {
    max = min;
    min = 0;
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}

// 获得随机数数组
Grid.prototype.shuffle = function (arr) {
  // 创建一个长度为size的数组
  // map方法要求一个可遍历的数组
  var arr = arr 
    ? arr 
    : Array.apply(null, {length: this.size})
      .map(function (item, index) {
        return index + 1;
      })
  var length = this.size;
  var shuffled = new Array(length);

  // 洗牌算法生成随机数组
  for (var index=0; index<length; index++) {
    var random = this.randomIndex(0, index);
    if (random !== index) {
      shuffled[index] = shuffled[random];
    }
    shuffled[random] = arr[index];
  }
  return shuffled;
}
// [4, 8, 7, 1, 6, 2, 5, 9, 3]
```

## 哈希表
接下来我们应该考虑的是如何在每次填充数字时进行行、列、宫的查重。不考虑ES6的Set，由于操作频繁我们就不能用的循环来查找该值是否多余，那么由**哈希**来做这项工作就在适合不过了。

### 概念
> 哈希表（Hash table，也叫散列表），是根据关键码值(Key value)而直接进行访问的数据结构。也就是说，它通过把关键码值映射到表中一个位置来访问记录，以加快查找的速度。

由概念可知，建立哈希表是为了通过key值直接访问其映射的值，时间复杂度只有**O(1)**。如果我们规定所建立的哈希表不能出现冲突，也就是一个key值只对应一个值，那么就可以通过判断key是否映射一个值来达到**查重**的目的。

在JavaScript中我们可以直接使用对象来实现哈希表。

因为数字填充是逐行逐列进行，所以我们只需通过哈希表来确认我们可以填写哪些值，然后从随机数组中选择。

## 按宫填写数字
接下来就到了建立数独终盘的关键环节了——***填写数字***

因为我们会建立行、列哈希表来防止重复，所以我们应当优先考虑在每宫数字不重复的原则下填写数字，也就是建立宫哈希表`var boxHash = {}`

### 实现
```js
this.box = [
  {rowStart: 0, rowEnd: 2, colStart: 0, colEnd: 2},// box1
  {rowStart: 0, rowEnd: 2, colStart: 3, colEnd: 5},// box2
  {rowStart: 0, rowEnd: 2, colStart: 6, colEnd: 8},// box3
  {rowStart: 3, rowEnd: 5, colStart: 0, colEnd: 2},// box4
  {rowStart: 3, rowEnd: 5, colStart: 3, colEnd: 5},// box5
  {rowStart: 3, rowEnd: 5, colStart: 6, colEnd: 8},// box6
  {rowStart: 6, rowEnd: 8, colStart: 0, colEnd: 2},// box7
  {rowStart: 6, rowEnd: 8, colStart: 3, colEnd: 5},// box8
  {rowStart: 6, rowEnd: 8, colStart: 6, colEnd: 8},// box9
];
this.rowHash = [];// 行列哈希表
this.colHash = [];// 按宫填写失败时重置

// 初始化并完成九宫格填写
Grid.prototype.fillGrid = function () {
  // 持续执行，直到完成填写
  while (true) {
    var flag = true;
    this.rowHash = [];// 重置
    this.colHash = [];

    // 建立可遍历矩阵
    for (var row=0; row<this.size; row++) {
      this.cells[row] = Array.apply(null, {length: this.size});
    }

    // 按宫填写数字
    for (var index=0; index<this.size; index++) {
      if (!this.fillBox(this.box[index])) {
        flag = false;// 标记某宫填写失败
        break;
      }
    }
    if (flag) {
      break;
    }
  }
  return true;
}

// 根据九宫格位置填写九宫格
Grid.prototype.fillBox = function (box) {
  var rowEnd = box.rowEnd + 1,
    rowStart = box.rowStart;
  var colEnd = box.colEnd + 1,
    colStart = box.colStart;
  var boxHash = {};// 九宫格哈希表
  var rowHash = this.rowHash;
  var colHash = this.colHash;
  var shuffled = this.shuffle();

  for (row=rowStart; row<rowEnd; row++) {
    if (!rowHash[row]) {
      rowHash[row] = {};
    }
    for (col=colStart; col<colEnd; col++) {
      if (!colHash[col]) {
        colHash[col] = {};
      }
      for (var index=0; index<shuffled.length; index++) {
        // 判断三个哈希表均无该值
        var value = shuffled[index];
        if (!rowHash[row][value] && !colHash[col][value] && !boxHash[value]) {
          boxHash[value] = true;
          rowHash[row][value] = true;// 更新哈希表
          colHash[col][value]  = true;
          this.cells[row][col] = value;
          break;
        }
      }
      // 若单元格填写失败，则此次九宫格创建失败
      if (!this.cells[row][col]) {
        return false;// 由于栈溢出，从递归改为循环
      }
    }
  }
  return true;
}
```

> 在这里一开始我尝试了递归，但是由于数字的随机性就不能保证递归的次数，容易发生栈溢出，所以改为了循环

## 按难度剔除数字
得到了一个数独终盘后，我们要做的就是按照难度剔除一定量的数字让玩家填写。这背后的逻辑其实就是将难度等级化成数字n，再获取一个与栅格size相同的随机数组，截取前n个数，将这些数作为序列数，将该行序列数对应的值变为0，最后渲染。

### 深拷贝
在复制原对象的九宫格进行操作时，我发现我对复制而来的九宫格数组进行操作时，原数组也会发生变化。这里就是遇到了深浅拷贝的问题。

JavaScript的对象类型大致分为两类：**基本类型**与**引用类型**，基本类型的数据储存在**栈内存**中，而引用类型由于体积原因所以将**指针**储存在**栈内存**中，实际数据则储存在**堆内存**中。所以我们平时利用变量访问引用类型数据，实际上是通过变量名存储的指针去访问在堆内存中的实际数据，所以我们通过变量名复制引用类型只是复制了一份变量的地址，它们依然指向同一个数据

``` js
// 一个数组的例子
var a = [1, 2, 3];
var b = a;

b[3] = 4;
console.log(b);// [1, 2, 3, 4];
console.log(a);// [1, 2, 3, 4];

// 对象
var a = {bar: 'bar', foo: 'foo'};
var b = a;

b.foo = 'baz';
console.log(b);// {bar: 'bar', foo: 'baz'}
console.log(a);// {bar: 'bar', foo: 'baz'}
```

以上只复制变量的赋值称为**浅拷贝**， 因为它只涉及指针的复制，并不会真正地开辟新的空间存储数据。

能够开辟新的存储地址的通常被称为**深拷贝**，它的实现一般是递归的访问每一项，并复制给新创建的同类型变量然后注入到事先创建好的引用类型中。

这里我们只是简单提及，并不深入，所以针对数组我采用了一个比较简单的深拷贝的方法：
``` js
// 实现原九宫格的深拷贝
Grid.prototype.deepClone = function (arr) {
  var _arr = JSON.stringify(arr);
  var arrClone = JSON.parse(_arr);

  return arrClone;
}
```
其中 `JSON.stringify()` 方法是将一个JavaScript值(对象或者数组)转换为一个**JSON字符串**，也就是一个基本类型的数据。接着`JSON.parse()`方法用来解析JSON字符串，构造由字符串描述的**JavaScript值或对象**。

不过它也有局限性：
* 无法复制函数
* 原型链没了，对象就是object，所属的类没了。

所以并不适合**复杂对象**，不过，这样的转换完全可以满足对于**数组**和**简单对象**的深拷贝

### 完成数字的剔除
``` js
// level = {
//   easy: 1/3,
//   normal: 1/2,
//   hard: 1-1/3,
// }

// 按难度返回九宫格
Grid.prototype.gameCells = function (level) {
  var gameCells = this.deepClone(this.cells);
  var length = level;
  var shuffled = [];
  var shuffledCol = 0;

  // 按难度每行去除数字
  for (var row=0; row<this.size; row++) {
    shuffled = this.shuffle();

    // 按难度截取随机数组前level个数, col序数为该数的单元格为0
    for (var index=0; index<length; index++) {
      shuffledCol = shuffled[index] - 1;
      gameCells[row][shuffledCol] = 0;
    }
  }
  return gameCells;
}
```
至此，生成数独的核心部分全部介绍完了

## Vue.js的后续组件开发
在操作DOM的问题上我选择了Vue.js，它可以高效地实现视图与数据间的双向绑定

<SourceLink filepath='/Projects/README.md' />
<LastEditTime filepath='/Projects/README.md' />