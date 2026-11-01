---
id: "5e15a9900694745d"
title: "JavaScript 变量提升：双语学习笔记"
description: "对变量与函数声明的提升行为有连续解释，保留中英对照及相关术语。"
date: null
topic: "principles"
tags: ["JavaScript","学习笔记"]
cover: "/media/knowledge-notes-21cc1f2b153367a1.png"
migrationNote: "整理自原官网的历史学习笔记，保留原有译文、引用和署名，不把资料内容认作本人研究或实践成果。正文按原稿保留。"
migrationReport: "/blog/website-migration"
assets: {}
---

## Javascript Hoisting Explained in 4 Minutes

Hoisting is the process of the Javascript interpreter pulling up or hoisting `var` variable and function declarations to the top of their scope before any code is executed. So this is the equivalent of them being at the top of your program, even when they are not. It's a fairly simple idea that can lead to some strange behavior that can get confusing at times. As we'll see in some of the examples coming up, we're going to cover exactly how hoisting works and go over some techniques to avoid it.

As we just discussed, `var` variable declarations are hoisted to the top of their scope. So the code that you can currently see on screen is actually processed by the Javascript interpreter. Like this, you can see that the declaration has been separated from the initialization, as the declaration has been hoisted above all of the other lines of code. In that scope, this means that it's possible to reference the variable even before it has been declared. `var` variable initializations are not hoisted, however, so the variable will not have a value.


Let's look at an example to see what's going on. So here we're printing out `x` and declaring it. After that, you can see that the result is `undefined` and not an error as you'd get in other languages. As the declaration was hoisted up before the `console.log` statement was executed. obviously if we remove the declaration, we'll get an error as the variable doesn't exist anymore.

Now, have a look what happens if we give `x` a value of 27?

The output will still be `undefined`. This is because the declaration gets hoisted above the `console.log`, but the initialization stays below that line. So it doesn't know anything about the value 27 at the time of execution. Now, let's see what happens if we remove the `var` keyword declaration from this example.

What happens? we get an error, but why is that? because, for those that don't know, when we initialize a variable without a keyword, it will automatically create a `var` declaration for that variable. Well, the reason we get an error is that the declaration is created on the line of the assignment and not before that line is executed.

So there is no declarations to hoist at the beginning. Therefore, when we attempt to `console.log`, there is no declaration for `x`. If we move the `console.log` below the line of initialization, we get the value printed out. This behavior is unique to variables declared with the keyword `var`. Variables declared with the keyword `let` are not hoisted.

Let's have a look at the same example we just looked at. But we'll replace the keyword `var` for `let`. As you can see, we get an error saying that `x` cannot be accessed before initialization. This is our first approach to avoiding hoisting, using the `let` or `const` keyword for variable declaration.

Hoisting also applies to function declarations. This allows us to call functions before they're even declared, which sounds bizarre when you're familiar with other languages like C++ or Java. Let's have a look at an example here. You can see that we've called a function before it's even declared, and it works perfectly.

As we get our statement printed out from the console.

Log in the function body. This function call works because of the same hoisting principles that apply to `var` declarations, the function declaration is hoisted up to the top of its scope. So, when our first line is executed, which is our function call, the program is already aware of the function. However, hoisting does not apply to anonymous functions. Let's have a look at an example.

As you can see, we've got the same sort of example. But we've now assigned the function to a variable anonymously, and we now receive an error. Because it's only name functions that get hoisted, so this is the second approach to avoiding hoisting, and that is by avoiding using name functions. Hoisting is a good topic to be aware of. Not only because it can cause some strange behavior in your code, but because a significant number of developers who use Javascript day-to-day probably aren't even aware of this taking place. This makes hoisting a good topic for an interview question, as it can really test the candidates knowledge of the language. If you enjoyed this video, like and subscribe as I've got some really interesting videos coming up.

Comment what you'd like to see me cover next? Cheers.

## 4 分钟解释 Javascript 提升

> 喜马拉雅：https://m.ximalaya.com/sound/824016860?from=pc

提升是 Javascript 解释器在执行任何代码之前，将 `var` 变量和函数声明拉高或提升到其作用域顶端的过程。因此，这相当于它们处于你的程序的顶层，即使它们并不在顶层。这是一个相当简单的想法，但却可能导致一些奇怪的行为，有时会令人困惑。在接下来的示例中，我们将详细介绍 “提升 ”是如何工作的，并介绍一些避免 “提升 ”的技巧。

```js
var x = 27;
console.log(x); // 27
```

正如我们刚才所讨论的，`var` 变量声明会被提升到其作用域的顶端。因此，你目前在屏幕上看到的代码实际上是由 Javascript 解释器处理的。像这样，你可以看到声明已经与初始化分离，因为声明已经被悬挂到所有其他代码行的上方。在这个范围内，这意味着甚至在变量被声明之前就可以引用它。然而，`var` 变量的初始化不会被悬挂，因此变量不会有值。

```js
var x;
x = 27;
console.log(x); // 27
```

```js
console.log(x); // 27
var x = 27;
```

让我们看一个例子来了解情况。在这里，我们打印出 `x` 并声明它。之后，你可以看到结果是 `undefined`，而不是其他语言中的错误。显然，如果我们删除声明，就会出现错误，因为变量已经不存在了。

```js
console.log(x); // Uncaught ReferenceError:x is not defined
x = 27;
```

现在，看看如果我们给 `x` 赋值 27 会发生什么？

```js
console.log(x); // Uncaught ReferenceError:x is not defined
x = 27;
```

输出结果仍然是 “未定义”。这是因为声明被挂在了 `console.log` 的上方，但初始化却停留在了该行的下方。因此，在执行时，它对值 27 一无所知。现在，让我们看看如果从这个示例中删除 `var` 关键字声明会发生什么。

```js
x = 27;
console.log(x); // 27
```

```js
var x;
console.log(x); // undefined
x = 27;
```

因为，对于那些不知道的人来说，当我们初始化一个没有关键字的变量时，它会自动为该变量创建一个 `var` 声明。我们之所以会出错，是因为声明是在赋值的那一行创建的，而不是在执行赋值之前创建的。

因此，在开始时没有任何声明。因此，当我们尝试输入 `console.log` 时，没有 `x` 的声明。如果我们将 `console.log` 移到初始化行的下面，就会得到打印出来的值。这种行为是使用关键字 `var` 声明的变量所特有的。使用关键字 `let` 声明的变量不会被挂起。

```js
console.log(x); // Uncaught ReferenceError: Cannot access 'x' before initialization
let x = 27;
```

让我们看一下刚才的例子。但我们将关键字 `var` 替换为 `let`。正如你所看到的，我们会得到一个错误信息：在初始化之前，不能访问 `x`。这就是我们使用 `let` 或 `const` 关键字声明变量的第一种避免提升的方法。

挂起同样适用于函数声明。这允许我们在函数声明之前就调用它们，如果你熟悉 C++ 或 Java 等其他语言，这听起来很奇怪。让我们来看一个例子。你可以看到，我们在函数声明之前就调用了它，而且效果非常好。

```js
thisIsHoisted();

function thisIsHoisted() {
  console.log("Called before function" + " has been declared");
}
```

当我们从控制台打印出我们的语句时。

函数体中的日志。这个函数调用之所以有效，是因为采用了与 `var` 声明相同的提升原则，即函数声明被提升到其作用域的顶端。因此，当我们执行第一行（即函数调用）时，程序已经知道了函数。然而，提升并不适用于匿名函数。我们来看一个例子。

```js
notHoisted();

var notHoisted = function() {
  console.log("Called before function" + " has been declared"); // Uncaught TypeError：notHoisted is not a function
}
```

正如你所看到的，我们得到了同样的例子。但是，我们现在将函数匿名赋值给了一个变量，结果出现了错误。因为只有名称函数才会被挂起，所以这是避免挂起的第二种方法，即避免使用名称函数。提升是一个值得注意的话题。这不仅是因为它会在你的代码中导致一些奇怪的行为，还因为大量日常使用 Javascript 的开发人员可能根本没有意识到这一点。因此，提升是一个很好的面试问题，因为它可以真正测试应聘者的语言知识。如果你喜欢这段视频，请点赞并订阅，因为我还会陆续推出一些非常有趣的视频。

## 单词&短语

1. *hoisting* [ˈhɔɪstɪŋ]：提升
2. *process* [ˈprɑːses]：过程；【计】进程
3. *pulling up* [ˈpʊlɪŋ ʌp]：向上拉起，当前语境可翻译为提升
4. *interpreter* [ɪnˈtɜrprɪtər]：【计】解释器
5. *variable declarations* [ˈveriəbl ˌdeklə'reɪʃənz]：变量声明
6. *the top of* [ðə tɑːp əv]：...的顶部
7. *executed* [ˈeksɪkjuːtɪd]：v. 【计】执行（代码）；执行（指令）
8. *the equivalent of* [ɪˈkwɪvələnt]：n. 等同于；相当于；与...等价
9. *being* [ˈbiːɪŋ]：v. 位于（be 的现在分词形式）
10. *program* [ˈproʊɡræm]：【计】程序
11. *fairly* [ˈferli]：adv. 相当地
12. *at times* [æt taɪmz]：有时候，
13. *coming up* [ˈkʌmɪŋ ʌp]：接下来
14. *go over* [ɡoʊ ˈoʊvər]：去往，走到（位置改变）；讨论；回顾；复习；仔细研究（思考）
15. *techniques* [tek'niːks]：技术；技巧
16. *As we just discussed*：正如我们刚刚讨论过的
17. *actually* [ˈæktʃuəli]：adv. 实际上
18. *processed* [ˈprɑːsest]：adj. 经加工的; 处理的
19. *separated* [ˈsepəreɪtɪd]：adj. 分开的（动词separate的过去式和过去分词.）
20. *initializations* [ɪˌnɪʃələˈzeɪʃənz]：【计】初始化
21. *reference* [ˈrɛfərəns]：【计】引用
22. *declaring* [dɪˈklɛrɪŋ]：v. 【计】声明
23. *initialize* [ɪˈnɪʃəˌlaɪz]：【计】初始化
24. *keyword* [ˈkiːwɜːrd]：关键字
25. *accessed* [ˈæksest]：【计】存取
26. *bizarre* [bɪˈzɑːr]：adj. 稀奇古怪的
27. *familiar* [fəˈmɪliər]：adj. 熟悉的；熟知的
28. *anonymous* [əˈnɑ:nɪməs]：匿名的
29. *to be aware of*：值得了解的...
30. *significant* /sɪɡˈnɪfɪkənt/：大量的（significant number of）
31. *day-to-day*：日常使用的；日常的
32. *taking place*：正在发生
