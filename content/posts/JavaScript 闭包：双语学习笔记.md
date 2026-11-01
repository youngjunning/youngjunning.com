---
id: "6246e4c8b62c1492"
title: "JavaScript 闭包：双语学习笔记"
description: "围绕词法环境、闭包与循环变量展开，保留双语解释和词汇积累。"
date: null
topic: "principles"
tags: ["JavaScript","学习笔记"]
cover: "/media/knowledge-notes-21cc1f2b153367a1.png"
migrationNote: "整理自原官网的历史学习笔记，保留原有译文、引用和署名，不把资料内容认作本人研究或实践成果。正文按原稿保留。"
migrationReport: "/blog/website-migration"
assets: {}
---

## Closures Explained in 100 Seconds

Javascript closures are functions that can access values outside of their own curly braces. In order to call a function in your code, the Javascript interpreter needs to know about the function itself and any other data from the surrounding environment that it depends on. Everything needs to be neatly closed up into a box before it can be fed into the machine. Take, for example, a pure function that only depends on its own arguments and internal data. What we have here is a fully self-contained, closed expression.

When it's called, it gets pushed onto the call stack, where it's executed, and its internal data is only kept in memory until it's popped back off the call stack. But what if that function references data outside of its own scope, like from the global environment, or an outer function? That leaves us with an open expression that references other free variables throughout the environment. Now, in order for the interpreter to call this function and also know the value of these free variables. It creates a closure to store them in a place in memory where they can be accessed later. That area of memory is called a heap, and unlike the call stack, which is short-lived, it can keep data in memory indefinitely. Then decide when to get rid of it later with the garbage collector.

So a closure is not just a function, it's a function combined with its outer state or lexical environment. As you might imagine, closures require more memory and processing power than a pure function. But you'll come across many practical reasons to use them, the most important one being data encapsulation to prevent leaking or exposing data where it's not needed. We can create a closure by defining an outer function that contains the state, then an inner function that operates on it. The data contained here will not leak out to the surrounding environment.

The inner function has access to data defined in the outer function's scope, but the outer function does not have access to the inner function. In addition, many Javascript APis are callback -based. You can use closures to create a function factory. That takes an argument, then returns a brand new function, which can then be passed along to other functions that expect a callback. This has been Javascript closures in 100 seconds, but stay tuned because today we're going beyond 100 seconds. To take a look at one of the most famous Javascript trick questions that will wreck you on an interview if you don't know closures.

But first, make sure to like and subscribe. I'm trying to fulfill my childhood dream of getting to a million subscribers, but it's going to be really hard to get there if you don't click the F button. Just kidding, I have a ton of fun making these videos and learn something new every time, a great example of which is this tricky Javascript interview. Question The question itself is, What does this code log out?

`let`'s go through it line by line. First, we're declaring a variable I with the `var` keyword, then a for loop that will run three times by incrementing that variable. Now, inside the for loop is where closures come into play. We define a function log that console logs the global variable I. This is not a pure function because it depends on a variable outside of its scope, therefore creating a closure.

Then from there, we set up a timeout and pass the log function as the callback. This queues up a task to execute the log function after 100 milliseconds. So what do you think the output of this code will be? We're capturing the I variable in the closure for each iteration of a loop. So it would seem like it should log out 0, 1, 2, but if we log it out, it actually console logs 3 three times.

To understand why that happens, we also need to understand the difference between `var` and `let` when you use `var`. In a for loop, that variable actually gets hoisted up into the parent scope, which in this case would be the global scope. Watch what happens when we change the variable to let we get our original expectation of a console log of 0 1 2 with `var`. We have a global variable that we're mutating over and over again.

But with `let`, we're creating a variable that is scoped to the for loop, in other words, it's local to the for loop and can't be accessed outside of it. Now, remember, a closure is the combination of a function and its lexical environment in the case of `let`, the closure is capturing the log function. Along with the variable I for each iteration of the loop, which would be 0, 1, 2 if we didn't have a closure here, Javascript would allocate that I variable in memory in the call stack and then immediately release it.

But because we do have a closure, it stores that variable in the heap memory, so it can be referenced again when that closure is called. By the timeout in the future. But when `var` is used, it's capturing the reference to the global variable. The reason it logs 3 three times is because the timeout doesn't run till 100 milliseconds later. Long after that, For Loop has completed and iterated up to 3. We can actually examine this behavior in the browser DevTools by adding a debugger to the closure if you try to run this code in the browser with the DevTools open. It will take you to the Sources tab and allow you to inspect the call stack and scope of the function.

When `let` is used, you can see we have a block scoped variable named I. But when `var` is used, that variable is now in the global scope. Which changes the way it's captured by the closure. That's a pretty tricky one, but Javascript interviewers love to ask questions like this. If you ever find yourself faced with a question like this, the best thing you can do is talk through the code slowly and explain how a closure works. So they know you're on the right track, even if you don't come to the right conclusion. I'm gonna go ahead and wrap things up there.

Thanks for watching and I will see you in the next one.

## 100 秒了解 Javascript 闭包

> 喜马拉雅：https://m.ximalaya.com/sound/822949006?from=pc

Javascript 闭包是可以访问自身大括号以外值的函数。为了调用你的代码中的函数，Javascript 解释器需要了解函数本身以及它所依赖的周围环境中的任何其他数据。在输入机器之前，一切都需要被整齐地封闭在一个盒子里。举例来说，一个纯函数只依赖于它自己的参数和内部数据。这就是一个完全自足的封闭表达式。

当它被调用时，会被推入调用栈并在那里执行，其内部数据只保留在内存中，直到从调用栈中弹出。但如果该函数引用了其自身作用域之外的数据，如来自全局环境或外部函数的数据呢？这样，我们就会看到一个开放式表达式，它引用了整个环境中的其他自由变量。现在，为了让解释器在调用该函数的同时，还能知道这些自由变量的值。解释器会创建一个闭包，将它们存储在内存中的某个位置，以便日后访问。这个内存区域被称为堆（heap），它与调用栈不同，调用栈的寿命很短，而堆则可以无限期地将数据保存在内存中。然后再通过垃圾回收器决定何时将其清除。

因此，闭包不仅仅是一个函数，它还是一个与其外部状态或词法环境相结合的函数。正如你所想象的，闭包比纯函数需要更多的内存和处理能力。但你会遇到很多使用闭包的实际原因，其中最重要的是数据封装，以防止数据泄漏或暴露在不需要的地方。我们可以通过定义一个包含状态的外层函数，然后定义一个对其进行操作的内层函数来创建闭包。这里包含的数据不会泄漏到周围环境中。

内部函数可以访问外部函数作用域中定义的数据，但外部函数不能访问内部函数。此外，许多 Javascript APis 都是基于回调的。你可以使用闭包创建一个函数工厂。它接收一个参数，然后返回一个全新的函数，然后可以将其传递给其他需要回调的函数。以上就是 100 秒内完成的 Javascript 闭包，但请继续关注，因为今天我们要在 100 秒内完成更多内容。来看看最著名的 Javascript 技巧问题之一，如果你不知道闭包，面试时就会被它难倒。

但首先，请务必点赞和订阅。我正在努力实现我儿时的梦想--让订阅人数达到一百万，但如果你不点击 F 按钮，那就真的很难达到目标了。开个玩笑，我在制作这些视频的过程中得到了很多乐趣，每次都能学到新东西，这个棘手的 Javascript 采访就是一个很好的例子。问题 问题本身是：这段代码记录了什么？

让我们一行一行地看。首先，我们用 `var` 关键字声明了一个变量 I，然后是一个 `for` 循环，该循环将通过递增该变量运行三次。现在，在 `for` 循环内部，闭包开始发挥作用。我们定义了一个函数 `log`，它可以在控制台中记录全局变量 `i` 的日志。这不是一个纯函数，因为它依赖于其作用域之外的一个变量，因此产生了一个闭包。

然后，我们设置一个超时，并将 `log` 函数作为回调函数。这样就可以在 100 毫秒后排队执行日志函数。你认为这段代码的输出会是什么？我们在循环的每次迭代中捕获闭包中的 I 变量。因此，它似乎应该记录 0、1、2，但如果我们记录它，它实际上控制台记录了三次 3。

要理解为什么会发生这种情况，我们还需要了解使用 `var` 时，`var` 和 `let` 之间的区别。在 `for` 循环中，变量实际上会被提升到父作用域，在本例中就是全局作用域。看看当我们把变量改为 `let` 时会发生什么。我们有一个全局变量，我们正在一遍又一遍地改变它。

但使用 `let` 时，我们创建的变量是 `for` 循环的作用域变量，换句话说，它是 `for` 循环的局部变量，不能在循环之外访问。请记住，闭包是函数及其词法环境的组合，在 `let` 的例子中，闭包捕捉的是 `log` 函数。在循环的每次迭代中，如果没有闭包，变量 I 的值分别为 0、1、2，Javascript 将在调用栈中分配 I 变量的内存，然后立即释放它。

但因为我们确实有一个闭包，所以它会将该变量存储在堆内存中，以便在调用闭包时能再次引用它。在将来超时的时候。但是，当使用 `var` 时，它会捕获对全局变量的引用。之所以会记录 3 三次，是因为超时要到 100 毫秒后才会发生。如果你尝试在浏览器中打开 DevTools 运行这段代码，我们可以通过在闭包中添加调试器在浏览器 DevTools 中检查这一行为。它将带你进入 Sources 选项卡，并允许你检查函数的调用堆栈和作用域。

当使用 `let` 时，你可以看到我们有一个名为 I 的块作用域变量。这就改变了闭包捕获变量的方式。这是一个相当棘手的问题，但 Javascript 面试官喜欢问这样的问题。如果你发现自己遇到了这样的问题，最好的办法就是慢慢讲述代码，解释闭包是如何工作的。这样，即使你没有得出正确的结论，他们也知道你的思路是正确的。我先走了，到此为止。

感谢您的收看，我们下期再见。

## 单词&短语

1. closure /ˈkloʊʒər/：【计】闭包
2. access /'ækses/：【计】访问
3. interpreter /ɪnˈtɜrprɪtər/：【计】解释器
4. argument /ˈɑːrɡjumənt/：【计】参数
5. internal /ɪnˈtɝːnəl/：【计】内部的
6. expression /ɪkˈsprɛʃən/：【计】表达式
7. pure function /pjʊr ˈfʌŋkʃn/：【计】纯函数
8. call stack /kɔːl stæk/：【计】调用栈
9. in order to /ɪn ˈɔːrdər tu/：为了
10. own /oʊn/：自己的
11. curly braces /ˈkɜːrli ˈbreɪsɪz/：花括号
12. surrounding /səˈraʊndɪŋ/：周围的
13. depend on /dəˈpɛnd ɑn/：依赖
14. neatly /ˈniːtli/：整齐的，整洁的
15. close up /kloʊz ʌp/：关闭；封闭
16. feed info（fed into）：注入，被输入到...中
17. self-contained /ˌself kənˈteɪnd/：完备的；自足的；完全自足的
18. executed /ˈeksɪkjuːtɪd/：执行
