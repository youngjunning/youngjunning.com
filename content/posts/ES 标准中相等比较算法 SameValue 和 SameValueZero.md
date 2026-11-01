---
id: "2245b342a181d416"
title: "ES 标准中相等比较算法 SameValue 和 SameValueZero"
description: "JavaScript 对值的相等判断有很多不同的算法，== 只是最常用的一种。由于 NaN 和正负零的涉入，除了 == 和 === 之外还有 SameValue 和 SameValueZero 算法。"
date: "2020-02-05"
topic: "principles"
tags: ["JavaScript","ES6","SameValue","SameValueZero","NaN"]
source: "https://github.com/youngjunning/blog.zisheng.pro/blob/3edd776416630100b4a100bc90b84dd1d66b3596/source/_posts/ES%20%E6%A0%87%E5%87%86%E4%B8%AD%E7%9B%B8%E7%AD%89%E6%AF%94%E8%BE%83%E7%AE%97%E6%B3%95%20SameValue%20%E5%92%8C%20SameValueZero.md"
sourceDate: "2020-02-05T10:35:30.000Z"
cover: "/media/article-title-2245b342a181d416.svg"
assets: {}
originalBodySha256: "2b84407deecb648581e5740d65fffa2b329fb9b806c0d0a41efa3a5c7018bae9"
---

JavaScript 对值的相等判断有很多不同的算法，`==` 只是最常用的一种。由于 `NaN` 和正负零的涉入，除了 `==` 和 `===` 之外还有 SameValue 和 SameValueZero 算法。

## `==`、`===`、SameValue

|           | ==                   | ===                   | SameValue（Object.is）       |
| --------- | -------------------- | --------------------- | ---------------------------- |
| `NaN`     | `NaN == NaN` `false` | `NaN === NaN` `false` | `Object.is(NaN, NaN)` `true` |
| `0`、`-0` | `0 == -0` `true`     | `0 === -0` `true`     | `Object.is(0, -0)` `false`   |

## SameValueZero

但是你在使用es6中有没有疑惑这种情况：

```js
const set = new Set()
set.add(0)
set.add(NaN)
set.has(-0) // true
set.has(NaN) // true
```

是不是与上述的三种算法的表现多不一样，这就是第四种比较算法 SameValueZero，它与 SameValue 的区别主要在于 `0` 与 `-0` 是否相等。

所以你在实践 `includes` 方法时，遇到：

```js
const array = [0, NaN]
array.includes(-0) // true
array.includes(NaN) // true
```

就不用大惊小怪了，因为 `includes` 内部使用的比较算法就是SameValueZero。
