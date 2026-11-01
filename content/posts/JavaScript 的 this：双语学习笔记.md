---
id: "7dec52ebcec42d10"
title: "JavaScript 的 this：双语学习笔记"
description: "围绕调用上下文、bind、call、apply 展开，保留原视频和中英对照。"
date: null
topic: "principles"
tags: ["JavaScript","学习笔记"]
cover: "/media/knowledge-notes-21cc1f2b153367a1.png"
migrationNote: "整理自原官网的历史学习笔记，保留原有译文、引用和署名，不把资料内容认作本人研究或实践成果。本篇有格式适配或明确勘误，详见官网迁移清单。"
migrationReport: "/blog/website-migration"
assets: {}
---

## What is `this` in JavaScript？


[查看原始媒体或资料](https://www.youtube.com/watch?v=YOlr79NaAtQ)


What is `this`? In Javascript, it's a keyword that references another value, usually an object that represents the current execution context. Okay, but what the hell does execution context mean? It either refers to your global environment, like the browser or node.Js, or when used inside a function, it references the object calling that function at a given time.

Open up the browser and run `console`.

Log `this`, you get the window object back because you're in the global execution context, doing the same thing in Node.JS from the command line gives you the global object back. Things get interesting when we talk about function context, define a function and then `console.log(this)` inside the function body.

Now, if we run this function in the browser, we'll still get the Window object back. That's because our global context is executing the function. Now, let's take that same function and use it as a property on an object. When we call the function on `this` object, it references `this` object. Now, sometimes you might have a function and an object defined separately.

You can tell the function to use some other object as its `this` value using the function's `bind` method. The result is a new function where any references to `this` inside the function will point to the object that you pass as the argument here. But where you'll see `this` used most often is in constructor functions. Using the new keyword, the new keyword allows you to call a function that creates an object where `this` is automatically bound to that newly created object. And that means you can create properties and methods like many other object-oriented programming languages.

For example, we can define a property like this name, then we can define a method like `sayHello` and use `this` to reference the name property on `this` object. And that gives us a convenient way to keep the data and functionality of an object tightly coupled together. But there's a lot more to `this` than meets the eye, so keep watching if you want to go beyond 100 seconds and learn some more advanced and weird aspects of `this`.

But first, make sure to hit the like button and subscribe.

Oh, hey there, thanks for sticking around. This is a special bonus segment where we can slow things down and take a deeper dive into Javascript. This, which gives you plenty of rope to hang yourself with. If you like this extra segment, let me know in the comments because there's always room to go beyond 100 seconds.

Over the next few minutes, we'll look at some caveats of `this`. Look at the `bind`, `call` and `apply` methods, and look at some more practical examples of object-oriented and functional programming patterns. So when I'm writing Javascript code and I see `this`, I always try to ask myself, What is `this`? But unfortunately, the answer is not very clear, because `this` in Javascript works differently than a lot of other languages, and it just seems completely weird. If you're brand new to programming now, here's caveat number one strict mode and non-strict mode. Back in the earlier days of Javascript, there were certain features of the language that sucked.

And so, with ES5, they introduced Strict Mode to turn some of those features off. For this video. I'm going to assume that you're in strict mode, if you're doing front-end development, you're probably in strict mode without even realizing it. But it's important to know that this behaves slightly different if you're not in strict mode. One of the most important differences is that in strict mode. If you call a function in the global context, this will be undefined, instead of referring to `window` or `global` in node.

This usually isn't a big deal because in most code, you'll just reference `window` or `global` directly, and not use `this` as a reference to those objects. Now, that's one thing to keep in mind. But I think the single most important caveat to understand with `this` is how it works. With arrow functions, as you can see here, we have an object on the first object property, we have a function defined with the function keyword. It's the same example that I showed you at the beginning of this video.

This, when called by the object, references the object that called that function. Now, if we write a second property and use an arrow function, you'll notice `this` is now the `global` object or `undefined` in strict mode in an arrow function. This is based on the enclosing object's execution context, which in this example, would be `global`. In other words, it doesn't have its own binding to `this`, so it looks up to its parent enclosing object and uses that this value. If you've ever used Vue.js, you'll notice in the documentation they tell you to use a regular function keyword as opposed to an arrow function. And that's because they're not really suitable for methods because of the way they interact with `this`.

So now that you know some of the caveats, we're going to look at three prototype methods that live on a function object `bind`, `call` and `apply`. Let's start by looking at Bind, because I think you'll come across this one most often. Let's imagine we have a function and an object, and these things are immutable, meaning we can't change them. The function references this inside the body, which in this case would be the global context. But we want it to use this other object as `this`. We can create a new function that's bound to `this` object by calling bind on the original function and passing the object as the argument.

When we execute this function, you'll notice that `this` now refers to the object we passed in. So, Bind gives you a way to explicitly set `this` on a function now. In other cases, you might want to call a function with a different this context, but not create a whole brand new function. And for that, you can use `call` or `apply`.

In this example, we use the `call` method on the function, and the first argument to it is it's `this` context that you want to set. This will call the function immediately, and you can pass additional arguments to it as well for the arguments that go to that function. And lastly, I'll point out that you also have the `apply` method, which is identical to `call`. The only difference is that the second argument is an array of arguments. A good way to remember the difference is to think a for array or `apply`, or c for comma or `call`. `call` is more common in modern Javascript because you can use the spread syntax on the arguments when you're working with an array.

But the bottom line is that they both serve the same purpose to call a function with an explicit `this` context. Now, it's worth noting that you tend to encounter `this` much more often in classical, object-oriented programming versus functional programming, both of which are programming paradigms that you can use. In Javascript, for example, one of the big motivations of React to use functional components over class-based components was so that developers wouldn't have to use `this` in their code. Because it gets even more complicated when you have a big framework with a bunch of dependencies and components. Personally, though, I find `this` to be very straightforward when working with Javascript constructor functions. Let's imagine we wanted to create a horse class.

When `this` function is called with a new keyword, it creates a new object, so we can create methods and properties on those objects by making a reference to `this`. So this works much more like a class definition in other languages like Java, Ruby, Python, and so on. And Javascript actually provides syntactic sugar for this whole process, using the `class` keyword. But we'll save that one for a future 100-second video. Because there's one more important thing that you should know about `this`, and that's a thing called method chaining.

You'll see a lot of Javascript libraries that allow you to chain methods together like this, always keeping a reference to the original object. So how do you chain methods together in Javascript? Well, you simply return `this` from your method, and now you can chain together an infinite number of method calls. Thanks for sticking around to go beyond 100 seconds.

I hope you learned something and I will see you in the next one.

## 单词&短语

- this [ðɪs]：在计算机编程中，“this” 通常是一个关键字，用于引用当前对象。它的具体含义和用法因编程语言而异。
  - 在 JavaScript 中，`this` 的值在不同的上下文中会有所不同。在对象的方法中，`this` 通常指向调用该方法的对象。但是在全局环境下，`this` 指向全局对象（在浏览器环境中是 window 对象）。在事件处理函数中，`this` 指向触发事件的元素。这种动态绑定的特性使得 JavaScript 的 `this` 用法比较复杂，但也提供了很大的灵活性。

## Javascript 中的 this 是什么？

> https://m.ximalaya.com/sound/834855573?from=pc

什么是 `this`？在 Javascript 中，它是一个关键字，用于引用另一个值，通常是一个代表当前执行上下文的对象。好吧，但执行上下文到底是什么意思？它指的是你的全局环境，比如浏览器或 node.Js，或者在函数内部使用时，它指的是在给定时间内调用该函数的对象。

打开浏览器，运行 `console`。

Log `this`，你会得到窗口对象，因为你是在全局执行上下文中，在 Node.JS 中通过命令行做同样的事情，你会得到全局对象。当我们谈到函数上下文时，事情就变得有趣了，我们定义了一个函数，然后在函数体中定义了 `console.log(this)` 。

现在，如果我们在浏览器中运行这个函数，我们仍然会得到 Window 对象。这是因为我们的全局上下文正在执行该函数。现在，让我们使用相同的函数，将其作为对象的属性。当我们在 `this` 对象上调用函数时，它会引用 `this` 对象。现在，有时你可能会分别定义一个函数和一个对象。

你可以使用函数的 `bind` 方法告诉函数使用其他对象作为其 `this` 值。这样就会产生一个新的函数，在这个函数中，任何对 `this` 的引用都将指向你作为参数传递的对象。但是，`this` 最常用的地方是在构造函数中。使用 new 关键字，new 关键字允许你调用一个函数来创建一个对象，其中 `this` 会自动绑定到这个新创建的对象。这意味着你可以像许多其他面向对象编程语言一样创建属性和方法。

例如，我们可以定义一个像 name 这样的属性，然后定义一个像 `sayHello` 这样的方法，并使用 `this` 来引用 `this` 对象上的 name 属性。这样，我们就可以方便地将对象的数据和功能紧密结合在一起。不过，`this` 的作用远不止这些，如果你想在 100 秒之后继续学习`this`，了解一些更高级、更奇特的方面，请继续观看。

但首先，请务必点击 “喜欢 ”按钮并订阅。

哦，嘿，谢谢你的收看。这是一个特别奖励环节，我们可以放慢节奏，深入学习 Javascript。这，让你有足够的绳子吊死自己。如果你喜欢这个额外环节，请在评论中告诉我，因为 100 秒之外还有更多空间。

在接下来的几分钟里，我们将看看 `this` 的一些注意事项。看看 `bind`、`call` 和 `apply` 方法，再看一些面向对象和函数式编程模式的实际例子。因此，当我在编写 Javascript 代码时看到 `this`，我总会试着问自己：`this` 是什么？但不幸的是，答案并不十分明确，因为 Javascript 中 `this` 的工作方式与许多其他语言不同，而且看起来完全怪异。如果你现在是编程新手，这里有第一条注意事项，即严格模式和非严格模式。在早期的 Javascript 中，该语言的某些功能非常糟糕。

因此，在 ES5 中，他们引入了 “严格模式 ”来关闭其中一些功能。在本视频中 我会假设你处于严格模式，如果你正在进行前端开发，你很可能在不知不觉中就进入了严格模式。但重要的是要知道，如果你不在严格模式下，其行为会略有不同。最重要的区别之一就是在严格模式下。如果你在全局上下文中调用函数，这将是未定义的，而不是在 node 中引用 `window` 或 `global`。

这通常不是什么大问题，因为在大多数代码中，你只会直接引用 `window` 或 `global` 而不会使用 `this` 作为对这些对象的引用。这是需要注意的一点。但我认为使用 `this` 时最重要的注意事项是它是如何工作的。对于箭头函数，正如你在这里看到的，我们在第一个对象属性上有一个对象，我们用 function 关键字定义了一个函数。这和我在视频开头给你展示的例子是一样的。

当对象调用该函数时，它将引用调用该函数的对象。现在，如果我们编写第二个属性并使用箭头函数，你会发现 `this` 现在是箭头函数中的 `global` 对象或严格模式下的 `undefined`。这是基于外层对象的执行上下文，在本例中就是 `global`。换句话说，它自己并没有绑定到 `this`，所以它会查找其父级外层对象并使用该值。如果你用过 Vue.js，你会注意到在文档中他们告诉你使用常规的函数关键字，而不是箭头函数。这是因为箭头函数与 `this` 的交互方式决定了它们并不适合用于方法。

既然你已经知道了其中的一些注意事项，我们现在就来看看函数对象上的三个原型方法：“绑定”、“调用 ”和 “应用”。让我们先来看看 “绑定”，因为我认为这是你最常遇到的方法。假设我们有一个函数和一个对象，而这些东西是不可变的，也就是说我们不能改变它们。函数在主体中引用这个对象，在本例中就是全局上下文。但我们希望它使用另一个对象作为 `this`。我们可以创建一个绑定到 `this` 对象的新函数，方法是在原始函数上调用 bind，并将对象作为参数传递。

当我们执行这个函数时，你会发现 `this` 现在指的是我们传入的对象。因此，Bind 为你提供了一种在函数上显式设置 `this` 的方法。在其他情况下，你可能想用不同的上下文调用一个函数，而不是创建一个全新的函数。为此，你可以使用 `call` 或 `apply`。

在本例中，我们在函数上使用了 `call` 方法，它的第一个参数就是你要设置的 `this` 上下文。这将立即调用函数，你也可以为它传递额外的参数，以获得进入该函数的参数。最后，我想说的是，你还可以使用 `apply` 方法，该方法与 `call` 相同。唯一不同的是，第二个参数是一个参数数组。记住区别的一个好方法是，用 a 表示数组或`apply`，用 c 表示逗号或 `call`。`call` 在现代 Javascript 中更为常见，因为在处理数组时，你可以在参数上使用展开语法。

但最根本的一点是，它们的作用是一样的，都是通过显式的 `this` 上下文来调用函数。现在，值得注意的是，在经典的面向对象编程与函数式编程中，你往往会更频繁地遇到 `this`，这两种编程范式你都可以使用。例如，在 Javascript 中，React 使用函数式组件而非基于类的组件的一大动机就是为了让开发人员不必在代码中使用 `this`。因为当你拥有一个带有大量依赖关系和组件的大框架时，情况就会变得更加复杂。不过我个人认为，在使用 Javascript 构造函数时，`this` 非常简单。假设我们想创建一个马类。

当使用 new 关键字调用 `this` 函数时，它会创建一个新对象，因此我们可以通过引用 `this` 来为这些对象创建方法和属性。因此，这更像是 Java、Ruby、Python 等其他语言中的类定义。实际上，Javascript 通过使用 `class` 关键字为整个过程提供了语法糖。不过我们会把这个留到以后的 100 秒视频中再讲。关于 `this`，你还应该知道一件重要的事情，那就是方法链。

你会看到很多 Javascript 库允许你像这样把方法链在一起，并始终保持对原始对象的引用。那么如何在 Javascript 中将方法链在一起呢？你只需从你的方法中返回 `this`，现在你就可以把无数个方法调用链在一起了。感谢您坚持到 100 秒之后。

希望你有所收获，我们下期再见。
