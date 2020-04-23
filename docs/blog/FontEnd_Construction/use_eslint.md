# ESLint 规范代码
[ESLint](https://cn.eslint.org/docs/user-guide/configuring)是一个开源的 JavaScript 代码检查工具，由 Nicholas C. Zakas 于2013年6月创建。代码检查是一种静态的分析，常用于寻找有问题的模式或者代码，并且不依赖于具体的编码风格。对大多数编程语言来说都会有代码检查，一般来说编译程序会内置检查工具。

JavaScript 是一个动态的弱类型语言，在开发中比较容易出错。因为没有编译程序，为了寻找 JavaScript 代码错误通常需要在执行过程中不断调试。像 ESLint 这样的可以让程序员在编码的过程中发现问题而不是在执行的过程中。

## 安装
使用以下命令安装：
```sh
$ npm install eslint --save-dev
```

要集成在 Webpack 中时，还需安装 loader ：
```sh
$ npm install eslint-loader --save-dev
```
然后在 `webpack.config.js` 配置文件中启用 loader ：
```js
module.exports = {
  // ...
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "eslint-loader",
        options: {
          // eslint options (if necessary)
        }
      }
    ]
  }
  // ...
};
```
当和 Babel 转码器一起使用时，可以：
```js
module.exports = {
  // ...
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ["babel-loader", "eslint-loader"]
      }
    ]
  }
  // ...
};
```
其中，`options` 选项[参考](https://www.npmjs.com/package/eslint-loader)。

## .eslintrc 配置文件
ESlint 被设计为完全可配置的，这意味着你可以关闭每一个规则而只运行基本语法验证，或混合和匹配 ESLint 默认绑定的规则和你的自定义规则，以让 ESLint 更适合你的项目。有两种主要的方式来配置 ESLint：
1. Configuration Comments - 使用 JavaScript 注释把配置信息直接嵌入到一个代码源文件中。
2. Configuration Files - 使用 JavaScript、JSON 或者 YAML 文件为整个目录（处理你的主目录）和它的子目录指定配置信息。可以配置一个独立的 `.eslintrc.*` 文件，或者直接在 `package.json` 文件里的 `eslintConfig` 字段指定配置，ESLint 会查找和自动读取它们，再者，你可以在命令行运行时指定一个任意的配置文件。

如果你在你的主目录（通常 `~/`）有一个配置文件，ESLint 只有在无法找到其他配置文件时才使用它。

有很多信息可以配置：

* Environments - 指定脚本的运行环境。每种环境都有一组特定的预定义全局变量。
* Globals - 脚本在执行期间访问的额外的全局变量。
* Rules - 启用的规则及其各自的错误级别。

## 常用配置
### env
一个环境定义了一组预定义的全局变量，这决定了你可以使用的语法或者API。常用的环境包括：
* `browser` - 浏览器环境中的全局变量。
* `node` - Node.js 全局变量和 Node.js 作用域。
* `es6` - 启用除了 `modules` 以外的所有 ECMAScript 6 特性（该选项会自动设置 `ecmaVersion` 解析器选项为 6）。
* `commonjs` - CommonJS 全局变量和 CommonJS 作用域 (用于 Browserify/WebPack 打包的只在浏览器中运行的代码)。
* `amd` - 将 `require()` 和 `define()` 定义为像 amd 一样的全局变量。
* `mocha` - 添加所有的 Mocha 测试全局变量。
* `mongo` - MongoDB 全局变量。
这些环境并不是互斥的，所以你可以同时定义多个。

要在你的 JavaScript 文件中使用注释来指定环境，格式如下：
```js
/* eslint-env node, mongo */
```
该设置启用了 Node.js 和 MongoDB 环境。

要在配置文件里指定环境，使用 env 关键字指定你想启用的环境，并设置它们为 true。例如，以下示例启用了 browser 和 Node.js 的环境：
```json
{
    "env": {
        "browser": true,
        "node": true
    }
}
```

### rules
ESLint 附带有大量的规则。你可以使用注释或配置文件修改你项目中要使用的规则。要改变一个规则设置，你必须将规则 ID 设置为下列值之一：

* `"off"` 或 `0` - 关闭规则
* `"warn"` 或 `1` - 开启规则，使用警告级别的错误：warn (不会导致程序退出)
* `"error"` 或 `2` - 开启规则，使用错误级别的错误：error (当被触发的时候，程序会退出)

为了在文件注释里配置规则，使用以下格式的注释：
```js
/* eslint eqeqeq: "off", curly: "error"*/
```
以上例子中，`eqeqeq` 规则被关闭，`curly` 规则被打开，定义为错误级别。

还可以使用 `rules` 连同错误级别和任何你想使用的选项，在配置文件中进行规则配置。例如：
```json
{
    "rules": {
        "eqeqeq": "off",
        "curly": "error",
        "quotes": ["error", "double"]
    }
}
```
其中 `"quotes"` 为引号的规则，被设置为双引号(`"double"`）。

你可以使用行内规则禁用（Disabling Rules with Inline Comments），可以在你的文件中使用以下格式的块注释来临时禁止规则出现警告：
```js
/* eslint-disable */

alert('foo');

/* eslint-enable */
```
你也可以对指定的规则启用或禁用警告：
```js
/* eslint-disable no-alert, no-console */

alert('foo');
console.log('bar');

/* eslint-enable no-alert, no-console */

```
如果在整个文件范围内禁止规则出现警告，将 `/* eslint-disable */` 块注释放在文件顶部：
```js
/* eslint-disable */

alert('foo');
```

### extends
值为 `"eslint:recommended"` 的 `extends` 属性启用一系列核心规则，这些规则报告一些常见问题，在 [规则页面](https://cn.eslint.org/docs/rules/) 中被标记为 ✅ 。这个推荐的子集只能在 ESLint 主要版本进行更新。

如果你的配置集成了推荐的规则：在你升级到 ESLint 新的主版本之后，在你使用命令行的 `--fix` 选项之前，检查一下报告的问题，这样你就知道一个新的可修复的推荐的规则将更改代码。

#### extends 和 rules
---
一个配置文件可以从基础配置中继承已启用的规则。

`extends` 属性值可以是：

* 在配置中指定的一个字符串
* 字符串数组：每个配置继承它前面的配置
* ESLint 递归地进行扩展配置，所以一个基础的配置也可以有一个 `extends` 属性。

`rules` 属性可以做下面的任何事情以扩展（或覆盖）规则：

* 启用额外的规则

* 改变继承的规则级别而不改变它的选项：
  * 基础配置：`"eqeqeq": ["error", "allow-null"]`
  * 派生的配置：`"eqeqeq": "warn"`
  * 最后生成的配置：`"eqeqeq": ["warn", "allow-null"]`

* 覆盖基础配置中的规则的选项
  * 基础配置：`"quotes": ["error", "single", "avoid-escape"]`
  * 派生的配置：`"quotes": ["error", "single"]`
  * 最后生成的配置：`"quotes": ["error", "single"]`

### parserOptions
ESLint 允许你指定你想要支持的 JavaScript 语言选项。默认情况下，ESLint 支持 ECMAScript 5 语法。你可以覆盖该设置，以启用对 ECMAScript 其它版本和 JSX 的支持。

同样的，支持 ES6 语法并不意味着同时支持新的 ES6 全局变量或类型（比如 `Set` 等新类型）。使用 `{ "parserOptions": { "ecmaVersion": 6 } }` 来启用 ES6 语法支持；要额外支持新的 `ES6` 全局变量，使用 `{ "env":{ "es6": true } }`(这个设置会同时自动启用 ES6 语法支持)。

解析器选项可以在 `.eslintrc.*` 文件使用 `parserOptions` 属性设置。可用的选项有：

* `ecmaVersion` - 默认设置为3，5（默认）， 你可以使用 6、7、8 或 9 来指定你想要使用的 ECMAScript 版本。你也可以用使用年份命名的版本号指定为 2015（同 6），2016（同 7），或 2017（同 8）或 2018（同 9）
* `sourceType` - 设置为 "script" (默认) 或 "module"（如果你的代码是 ECMAScript 模块)。
* `ecmaFeatures` - 这是个对象，表示你想使用的额外的语言特性:
* `globalReturn` - 允许在全局作用域下使用 return 语句
* `impliedStrict` - 启用全局 strict mode (如果 ecmaVersion 是 5 或更高)
* `jsx` - 启用 JSX

请注意，对 JSX 语法的支持不用于对 React 的支持。React 使用了一些特定的 ESLint 无法识别的 JSX 语法。如果你正在使用 React 并且想要 React 语义支持，我们推荐你使用 [eslint-plugin-react](https://github.com/yannickcr/eslint-plugin-react)。

### 一个例子
以下是一个启用了常用配置的配置文件：
```json
{
  "parserOptions": {
    "ecmaVersion": 6,// 支持 ES6 语法
    "sourceType": "module"// 使用模块
  },
  "extends": "eslint:recommended",// 继承推荐规则
  "rules": {// 扩展规则
      "semi": ["error", "always"],
      "quotes": ["error", "single"]// 单引号
  },
  "env": {// 定义代码运行环境
    "browser": true,
    "node": true,
    "es6": true
  }
}
```

## 使用 JSX
在使用 Vue 进行组件开发时，我个人更倾向在 Webpack 构建过程中使用 ES Module (基于构建工具使用) 的[运行时版本](https://cn.vuejs.org/v2/guide/installation.html#%E5%AF%B9%E4%B8%8D%E5%90%8C%E6%9E%84%E5%BB%BA%E7%89%88%E6%9C%AC%E7%9A%84%E8%A7%A3%E9%87%8A)，这样可以减少 30% 的代码体积，但是这就不支持 `template` 模版编译而要使用 `render` 函数了。对比 `render` 函数，[JSX](https://cn.vuejs.org/v2/guide/render-function.html#JSX) 更为简洁。 ESLint 并不支持 JSX 的语法检查，但可以通过安装特定插件来实现。

这里我使用了 [eslint-plugin-jsx-a11y](https://github.com/evcohen/eslint-plugin-jsx-a11y) JSX 语法检查插件来支持。

安装：
```sh
npm install eslint-plugin-jsx-a11y --save-dev
```

修改 `.eslintrc` 配置文件，添加插件：
```json
{
  "plugins": [
    "jsx-a11y"
  ]
}
```

增加继承规则：
```json
{
  "extends": [
    "plugin:jsx-a11y/recommended"
  ]
}
```

基于需要修改特定规则：
```json
{
  "rules": {
    "jsx-a11y/rule-name": 2
  }
}
```

该插件更多配置项[参考](https://github.com/evcohen/eslint-plugin-jsx-a11y#supported-rules)。