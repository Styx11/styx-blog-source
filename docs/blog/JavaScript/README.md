# Fisher-Yates洗牌算法
Fisher–Yates洗牌算法也被称做高纳德置乱算法，通俗说就是生成一个有限集合的随机排列。Fisher-Yates洗牌算法是无偏的，所以每个排列都是等可能的，当前使用的Fisher-Yates随机置乱算法是相当有效的，需要的时间正比于要随机置乱的数，不需要额为的存储空间开销。

简单来说 Fisher–Yates 洗牌算法是一个用来将一个有限集合生成一个随机排列的算法（数组随机排序）。这个算法生成的随机排列是等概率的。同时这个算法非常高效。

## 算法步骤
1. 定义一个数组（shuffled），长度（length）是原数组（arr）长度
2. 取 0 到 index (初始0) 随机值 rand, 赋值shuffled[index] = shuffled[rand], shuffled[rand] = arr[index]
3. index++ ; 重复第二步，直到 index = length -1


简单来说，就是 shuffled 从 0 到 length-1 取随机序号进行赋值的过程，并且新加入的值是 arr[index]。

## 实现代码
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