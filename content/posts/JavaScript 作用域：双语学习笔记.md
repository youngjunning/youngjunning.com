---
id: "c92852c18f70720b"
title: "JavaScript 作用域：双语学习笔记"
description: "解释作用域链及内外作用域关系，与闭包笔记形成可回看的知识链。"
date: null
topic: "principles"
tags: ["JavaScript","学习笔记"]
cover: "/media/knowledge-notes-21cc1f2b153367a1.png"
migrationNote: "整理自原官网的历史学习笔记，保留原有译文、引用和署名，不把资料内容认作本人研究或实践成果。正文按原稿保留。"
migrationReport: "/blog/website-migration"
assets: {}
---

> 喜马拉雅：https://www.ximalaya.com/gerenchengzhang/86760688/823314624

# Understanding Scope in Javascript

Hello and welcome to Compscience Simplified.

Today, we look into an important concept in Javascript that not only helps us understand how variables are accessed by the engine, but also help us understand more complex concepts like closures. Which will help in our next Javascript interview, let's begin. According to MDM, Scope is the current context of execution, it is the area in which the values are currently visible or accessible to the engine. The variables not in the current scope cannot be accessed, although there is a caveat.

There are mainly three types of scopes that we come across in our day-to-day use of the language. Let's look at them one by one. The first one is the global scope. Whenever we place any piece of code that is not inside of any function, it is said to be in the global scope by default. Here's an example.

In this code snippet, this variable, `global` in this function are both in the global scope. What this means is that we can access their values from anywhere inside of the code, and we'll be able to do that successfully. For instance, notice the inner function that is defined inside of the function in global scope, we are able to easily access the value of `global` inside of it too.

Next, we have the function scope, which means that variables that are declared within a function are only accessible inside of that function, but not outside of it. Continuing with the previous example, if we define a variable inside of the inner function and then try to access it anywhere outside of that function, we get an error. That is because, as the variable was declared inside of the inner function, its scope is limited to the boundaries of that function and to the engine. It is as good as the variable does not exist outside of that function. Now, let's look at the third kind of scope that exists, which is block scope. This is a special type of scope which applies to variables that are declared using the `let` or the `const` keyword only.

According to the rules of block scope, variables that are declared inside of a block or a pair of braces can only be accessed inside of that block and nowhere outside of it. Let's understand this with an example. In this example, we are just creating a new variable called `blocked`, using the `let` keyword inside of the `if` block. When we try to log that variable towards the end of the function, we get a reference error, even though we are trying to reference the variable inside the same function. This is because it was declared using the `let` keyword and hence its scope to block.

Due to that, it does not exist anywhere outside of the block. If we declare the same variable using the `var` keyword instead of the `let` keyword, the code starts to function as expected. Because it is then scoped to the entire function and not the block. Let us now discuss the caveat, which we talked about. But before that, if you learned something new today, click that like button so that YouTube knows this video is useful. It might be clear from what we discussed just now. But we want to state it here again that a variable declared in a particular scope is available for access in all the inner scopes.

For instance, the variable `outer` declared in the outer function here can be logged inside of the inner function because it is technically inside of the scope of the outer function. This is possible because when the Javascript compiler is unable to resolve a variable in the current scope, it keeps moving up into the outer scope step by step and tries to find the said variable. This is called the scope chain, it does this all the way up to the global scope. And if the variable is still not resolved, then we get the error that the variable is not defined. Which means even if this variable was defined somewhere higher up, like in the global scope, we would still not get this error.

But if it was not present anywhere throughout the scope chain, only then we get this error. And those are the basics about scope in Javascript. See you in the next one, where we cover the concept of closures in Javascript.

## 单词&短语

1. scope [skoʊp]：【计】作用域
1. **although** [ɔːlˈðoʊ]：虽然，尽管，既是
1. **day-to-day**：日常使用的；日常的
1. **closures** [ˈkloʊʒərz]：闭包
1. **for instance** [fɔːr ˈɪnstəns]：例如
1. **within** [wɪˈðɪn]：在...之内
1. **accessible** [əkˈsesəb(ə)l]：【计】可访问的（数据、文件、系统资源）
1. **access** [ˈækses]：【计】访问（数据、文件、系统资源）
1. **accessed** [ˈæksest]：【计】访问（access 的过去式和过去分词）
1. **anywhere** [ˈeniwer]：adv.无论何处
1. **because** [bɪˈkɔːz]：conj. 因为
1. **a pair of**：一对
1. **resolve** [rɪˈzɑːlv]：【计】解析
1. **concept** [ˈkɑːnsept]：【计】概念

## 译文

今天，我们将探讨 Javascript 中的一个重要概念，它不仅能帮助我们理解引擎如何访问变量，还能帮助我们理解闭包等更复杂的概念。这将有助于我们接下来的 Javascript 面试，让我们开始吧。根据 MDM，“作用域”（Scope）是当前的执行上下文，是引擎当前可见或可访问的值所在的区域。不在当前作用域内的变量无法访问，但有一个注意事项。

在日常语言使用中，我们主要会遇到三种作用域。下面让我们逐一介绍。第一种是全局作用域。每当我们放置任何一段不在任何函数内的代码时，默认情况下它就处于全局作用域中。下面是一个例子。

在这段代码中，这个变量和这个函数中的 `global` 都在全局作用域中。这意味着我们可以从代码内部的任何地方访问它们的值，并且可以成功地完成访问。例如，请注意定义在全局作用域函数内部的内部函数，我们也可以轻松地访问它内部的 `global` 值。

接下来是函数作用域，这意味着在函数内部声明的变量只能在函数内部访问，而不能在函数外部访问。继续前面的例子，如果我们在内部函数中定义了一个变量，然后试图在该函数之外的任何地方访问它，就会出现错误。这是因为，由于变量是在内部函数内部声明的，因此其作用域仅限于该函数和引擎的边界。就像变量不存在于该函数之外一样。现在，我们来看看第三种作用域，即块作用域。这是一种特殊的作用域，只适用于使用 `let` 或 `const` 关键字声明的变量。

根据块作用域的规则，在块或一对大括号内声明的变量只能在块内访问，而不能在块外访问。让我们通过一个例子来理解这一点。在这个例子中，我们只是在 `if` 代码块中使用 `let` 关键字创建了一个名为 `blocked` 的新变量。当我们试图在函数末尾记录该变量时，会出现引用错误，尽管我们是在同一个函数中引用该变量。这是因为变量是使用 `let` 关键字声明的，因此它的作用域是块。

因此，它不存在于代码块之外的任何地方。如果我们使用 `var` 关键字而不是 `let` 关键字来声明同一个变量，代码就会开始正常运行。因为它的作用域是整个函数，而不是代码块。现在，让我们来讨论一下我们谈到的注意事项。但在此之前，如果你今天学到了新东西，请点击那个赞按钮，让 YouTube 知道这个视频很有用。从我们刚才的讨论中，大家可能已经清楚了。但我们想在此再次说明，在特定作用域中声明的变量可以在所有内部作用域中访问。

例如，在这里的外层函数中声明的变量 `outer` 可以在内层函数中登录，因为从技术上讲，它属于外层函数的作用域。之所以能做到这一点，是因为当 Javascript 编译器无法解析当前作用域中的变量时，它会一步一步地向上移动到外层作用域，并尝试找到所述变量。这就是所谓的作用域链，它会一直这样做直到全局作用域。如果变量仍未被解决，我们就会得到 “变量未定义 ”的错误信息。也就是说，即使这个变量被定义在更高的地方，比如全局作用域，我们也不会得到这个错误。

但如果它在整个作用域链中的任何地方都不存在，我们才会得到这个错误。以上就是有关 Javascript 中作用域的基础知识。下一篇我们将介绍 Javascript 中闭包的概念，敬请期待。
