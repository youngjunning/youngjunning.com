---
id: "aa89c4c52bdf701d"
title: "JavaScript 原型链：双语学习笔记"
description: "包含 Object.create 的具体示例和属性查找过程，保留原作者署名及词汇。"
date: null
topic: "principles"
tags: ["JavaScript","学习笔记"]
cover: "/media/knowledge-notes-21cc1f2b153367a1.png"
migrationNote: "整理自原官网的历史学习笔记，保留原有译文、引用和署名，不把资料内容认作本人研究或实践成果。正文按原稿保留。"
migrationReport: "/blog/website-migration"
assets: {}
---

## What is a Prototype Chain in Javascript？

Hey, developers, ever wondered how Javascript objects share properties and methods? Let's break down the prototype chain in just 60 seconds.

In Javascript, every object has a hidden link called or its prototype. If a property or method isn't found on the object, Javascript looks up these prototype.

This lookup process continues up the prototype chain. It starts with your object, moves to its prototype and keeps going until it either finds the property or hits `null`. The end of the chain. Here, `customObj` inherits name from `obj` and `toString` from `Object.prototype`. That's the power of the prototype chain. And that's the prototype chain.

It's Javascript's way of enabling inheritance and code reuse. Want to dive deeper? Let me know in the comments. Don't forget to like, share and subscribe to 404Developer for more Javascript tips. See you next time.

## Javascript 原型链是什么？

> 喜马拉雅：https://m.ximalaya.com/sound/822546692?from=pc

嘿，开发者，有没有想过 Javascript 对象是如何共享属性和方法的？让我们在 60 秒内拆解下原型链。

在 Javascript 中，每个对象都有一个称为原型的隐藏链接。如果在对象上找不到属性或方法，Javascript 就会查找这些原型。

这个查找过程会一直沿着原型链向上进行。它从你的对象开始，移动到它的原型，直到找到属性或找到 `null`。这就是原型链的终点。在这里，`customObj` 从 `obj` 继承名称，`toString` 从 `Object.prototype` 继承。这就是原型链的威力。这就是原型链。

这是 Javascript 实现继承和代码重用的方法。想深入了解吗？请在评论中告诉我。别忘了点赞、分享和订阅 404Developer，获取更多 Javascript 技巧。下次见。

```js
const obj = { name: "俊宁" };

const custom = Object.create(obj);

// Inherited from obj
console.log(custom.name);

// Found in Object.prototype
console.info(custom.toString());

// custom's prototype is obj
console.info(custom.__proto__)


// custom's prototype is Object
console.info(obj.__proto__)

// Object's __proto__ is null
console.info(obj.__proto__.__proto__)
```

## 单词&短语

1. wondered /ˈwʌndərd/：vt. 对…感到好奇
2. property /ˈprɑpərti/：属性
3. prototype /ˈproʊtəˌtaɪp/：原型
4. looks up /lʊksʌp/：向上查找
5. continues up /kənˈtɪnjuːzʌp/：沿着...向上进行
6. object /ˈɑːbdʒekt/：对象
7. keeps going：持续进行
8. until /ənˈtɪl/：直到
9. either...or /ˈiːðər ɔːr/：...或者...；不是...就是...
10. inherit /ɪnˈherɪt/：vt.继承
11. enabling /ɪˈneɪblɪŋ/：实现，是可能
12. inheritance /ɪnˈhɛrɪtəns/：n.继承
13. comments /ˈkɑːments/：注释
14. power /ˈpaʊər/：力量
