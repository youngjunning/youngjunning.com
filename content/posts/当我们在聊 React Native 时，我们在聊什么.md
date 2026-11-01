---
id: "846c047d1b11cef0"
title: "当我们在聊 React Native 时，我们在聊什么"
description: "那是 18 年的夏天，公司 6 月底去成都团建回郑州后，小弟、肖老师和当时绰号小萌的我（以下简称三剑客）开始了使用 React Native 开发 App 的工作。当时经验尚浅的我也只是有小程序和公众号的开发经验，唯一的亮点就是封装了 wx-promise-pro 并独立完成了一个小程序的全栈开发，而另外两位同事一个后端大佬经验丰富，一个 ios、vue、android、C#、Java 等等技能栈点满。"
date: "2023-04-19"
topic: "reflections"
tags: ["React Native","跨端开发","RN","Flutter","Weex"]
source: "https://github.com/youngjunning/blog.zisheng.pro/blob/3edd776416630100b4a100bc90b84dd1d66b3596/source/_posts/%E5%BD%93%E6%88%91%E4%BB%AC%E5%9C%A8%E8%81%8A-RN-%E6%97%B6%EF%BC%8C%E6%88%91%E4%BB%AC%E5%9C%A8%E8%81%8A%E4%BB%80%E4%B9%88.md"
sourceDate: "2023-04-19T18:01:42.000Z"
cover: "/media/article-title-846c047d1b11cef0.svg"
assets: {"https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c327b38e8ca3410ea7f74d67d8080ccb~tplv-k3u1fbpfcp-zoom-1.image":"/media/1eed5c228c243412b92f7d50.png"}
originalBodySha256: "0335d30c7f2c161950fc3eacdd8033a48ac376fb616d61d0e8621218719c3d64"
---

## 缘起

那是 18 年的夏天，公司 6 月底去成都团建回郑州后，小弟、肖老师和当时绰号小萌的我（以下简称三剑客）开始了使用 React Native 开发 App 的工作。当时经验尚浅的我也只是有小程序和公众号的开发经验，唯一的亮点就是封装了 [wx-promise-pro](https://github.com/youngjuning/wx-promise-pro) 并独立完成了一个小程序的全栈开发，而另外两位同事一个后端大佬经验丰富，一个 ios、vue、android、C#、Java 等等技能栈点满。

怎么说呢，当时也就中等焦虑吧。也就赶鸭子上架各种不适，也就睡不好吃不好担心末位淘汰，也就担心没工作被我爸唠叨。

![紫升](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c327b38e8ca3410ea7f74d67d8080ccb~tplv-k3u1fbpfcp-zoom-1.image)

人们常说压不倒你的，最终都能成就你。我就是顶着巨大心里压力一头扎进了跨端开发这个领域，一晃便是两年多过去了。接着掘金的活动，和大家聊一聊 RN 的一些事。

## 聊聊 React Native 入门

找到紫升询问 React Native 最多的问题便是 React Native 环境的搭建，我都会耐心地帮助大家排查（有时也会让仔细看官网）。这个时候我一般都会和他们聊一下我们三剑客初次搭建环境最快的也是用了一整个工作日，最慢的因为电脑环境混乱多花了一个周末排查问题的故事。

万事开头难这句话用在 RN 和 Flutter 上尤其合适，跨端对于原生转和前端上手都是不太友好的，所以不要再问前端转合不合适，原生转不比你舒服到哪里去。

这里提醒大家关于环境的几点：

- Java jdk 一定要安装 **1.8** 系列
- 尽量使用安卓真机测试
- 如果用 Android Studio 打开项目，不要跟着提示随便升级 gradle
- RN 0.60 之后 ios 使用 cocoapod 管理项目依赖，这玩意如果网速不好，会卡住。建议别折腾，买个 \*\* 也饿不死人的

## 聊聊跨端开发

跨端开发也叫 Hybrid Development，React Native、Flutter、Weex 都属于这个范畴。任何事物的出现必然是有其客观需求存在，跨端开发相较于传统的原生开发有其迭代周期快、可以在发布应用后热更新代码、甚至代码直接通过服务动态下发的优点，相较于 Codava、H5 打包这种解决了 60 帧问题，性能更好更接近原生。

目前前两者在各大厂 App 中都有业务落地，众所周知的闲鱼使用 Flutter 写了不少业务，前文提到的我们三剑客是完全用 React Native 搭建的项目，而现在我所在的涂鸦智能的 App 是使用原生搭建项目，嵌入我们的核心面板业务。我们不可能把所有的设备控制面板都写在 App 中，ios、android 的平台也不能动态下发代码，而 React Native 可以实现开发面板 -> 打包 -> 注册到云端 -> 客户端根据从服务端动态加载相应的业务代码这个流程。顺便提一下隔壁小组也有在做基于 Flutter 的一码多端方案，加入涂鸦，无论你是 RN 开发者还是 Flutter 开发者都能发挥所长。

## 从事 RN 开发需要会什么？

以我的经验来看，只要你有编程经验，快速从事 RN 业务开发难度并不大。写页面用到的无非是 React 语法、React Native 内置组件的使用和第三放组件、API 的使用。

但是如果是要掌控整个 App 的架构和开发，那要求会多一些。但也无非是 React 开发同样需要掌握的全局状态管理、路由管理、组件封装等能力。

你可能会问不会原生开发可以从事 RN 开发吗？答案是肯定的，跨端方案的出现对于前端开发者的一大利好便是可以使用前端技术开发移动应用。React Native 不管是官方还是社区都有大量的封装好的 SDK 可供使用，比如 [react-native-svg](https://github.com/react-native-svg/react-native-svg)、[react-native-camera](https://github.com/react-native-camera/react-native-camera)、[react-native-video](https://github.com/react-native-video/react-native-video)、[react-native-sound](https://github.com/zmxv/react-native-sound)、[react-native-permissions](https://github.com/zoontek/react-native-permissions) 等等这些优秀的三方库。当然你可能还有疑问，如果社区没有现成的，或者需要自定义原生的功能才能完成业务怎么办？这个就没那么简单了，但是别担心，现代工业社会是讲究协作和精细化分工的，在涂鸦，我们有专业的原生开发团队为我们提供底层 SDK 业务编写，但是我还建议大家 ios、android 的桥接代码还是要会写、原生的配置要懂，有助于提升个人能力和稀缺性。相信我这并不复杂，你遇到的问题搜一下也能解决。紫升的经验也仅限于掌握原生配置、对原生 SDK 进行封装暴露接口给 JS 层调用，ios 课程买了有一年了，也没看一点（实在惭愧）。对原生 SDK 桥接感兴趣的可以看下[原生模块简介](https://reactnative.cn/docs/native-modules-intro)和[create-react-native-module](https://github.com/brodybits/create-react-native-module)。

## 聊聊我为社区做的一些事

> 你可能会在各种 react native 仓库的 issue 中看到我的身影，这里也推荐大家遇到什么问题多去 github 看看 issues，一个成熟的仓库基本都能在 issue 中找到解决办法。

- [umi-plugin-react-native](https://github.com/youngjuning/umi-plugin-react-native)：Show React Native Demo with dumi powered by react-native-web
- [react-native-quill-editor](https://github.com/youngjuning/react-native-quill-editor)：React Native Quill Rich Text Editor Wrapper
- [react-native-form](https://github.com/sishuguojixuefu/react-native-form)：私塾React Native动态表单项目，这个项目后来只在内部更新了，离职一年多了，大概率被同事重构了已经，我一直说要用 hooks 实现以下，也没得机会。
- [react-native-screenshot](https://github.com/sishuguojixuefu/react-native-screenshot)：简单易用的 React Native 截屏、监听系统截屏事件组件（ios、android）
- [react-native-office-viewer](https://github.com/sishuguojixuefu/react-native-office-viewer)：Office Preview Plugin for React Native（support png,pdf,doc,xls,txt...）
- [react-native-template-sishu](https://github.com/sishuguojixuefu/react-native-template-sishu)：👾 Clean and minimalist React Native template for a quick start with TypeScript.
- [react-native-qiniu](https://github.com/sishuguojixuefu/react-native-qiniu)：Qiniu React Native SDK ,A pure javascript implementation
- [react-native-float-ball](https://github.com/sishuguojixuefu/react-native-float-ball)：🏀 floatBall with PanResponder 🏈
- [优雅地使用TypeScript开发React Native应用](https://juejin.cn/post/6844903843155689486)
- [react-navigation 5.x 最佳实践](https://juejin.cn/post/6844904069937496071)
- [React Native 项目架构面面观](https://juejin.cn/post/6844904071137247240)
- [React Native 集成 CodePush 指南](https://juejin.cn/post/6844904073309716494)
- [【译】在 React Native TypeScript 项目中使用 defaultProps](https://juejin.cn/post/6844904083468337160)
- [【译】在 React Native TypeScript 项目中使用 defaultProps](https://juejin.cn/post/6859039959299391496)
- [手摸手带你封装 React Native 富文本编辑器](https://juejin.cn/post/6867945949788897288)
- [React Native 调试最佳实践|牛气冲天新年征文](https://juejin.cn/post/6928412126587387917)

## 聊聊岗位待遇

有一说一，React Native 包括 Flutter 在内，岗位比 Web 前端开发是要少很多的，但是这并不意味着不值得投资。相较于 Web 开发，跨端开发需要掌握更多的技能，入门更难一些。但是一般掌握了它，对应的薪资待遇也是很诱人的。
