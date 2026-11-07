---
id: 08de6927bb8b9143
title: 漫画拆解 ChatGPT App：内置浏览器藏在哪里
description: 沿用原稿记录的特定 macOS 应用版本，解释 Electron 宿主、内嵌 Chromium 与任务控制层的关系，不推导未经验证的运行时能力。
date: '2026-10-31'
updatedAt: '2026-11-07'
topic: principles
tags:
  - ChatGPT
  - Electron
  - Chromium
  - Agent
  - 漫画
collection: docs
cover: /media/08de6927bb8b9143-a9c339c97eba9342.webp
---
## 修订记录

| 版本 | 修订时间 | 修订内容 |
| --- | --- | --- |
| 第 1 次修订 | 2026.11.07 | 同步安装包证据、OWL 判断边界及 Runtime 延伸阅读。 |

在 ChatGPT 桌面应用里点开一张网页，读者看到的是标签页、地址栏和菜单。它们由什么承载？Agent 又怎样操作当前页面？这次从 `ChatGPT.app/Contents` 入手，沿着安装包、网页宿主和控制通道，一层层核对。

`app.asar` 是 Electron 应用常用的资源归档文件，里面打包了应用代码和前端资源。本文通过它查看应用如何创建、管理网页；浏览器内核本身不在这个文件里，而是随应用放在 `Frameworks` 目录。

[![封面：小狐和小机打开应用箱，发现里面装着完整的浏览器引擎](/media/08de6927bb8b9143-8adc3dce5f57c256.webp)](/media/08de6927bb8b9143-8adc3dce5f57c256.webp)

## 一句话总结

**在检查的 macOS 版本中，ChatGPT 随应用分发 Chromium，使用 Electron 与 React；网页由 Electron `<webview>` 嵌入，应用主进程管理标签页、权限等行为，代码中能追到 Browser Use 后端通过 CDP 接入页面的路径。** 这证明了产品的集成方式，不能仅凭安装包还原 OWL 的全部实现，更不能把 Atlas 的公开架构直接当作此版 ChatGPT 的进程图。

下面的角色和场景是机制示意，不是产品界面截图。分析对象为 macOS 上的 **ChatGPT 26.1023.51421，build 22530**，检查日期为 2026 年 10 月 31 日。这是一轮安装包静态分析，没有执行真实网页任务，也不代表其他平台或历史版本采用相同实现。

## 第一幕与第二幕：箱子里自带引擎，铭牌还要再核对

[![第一、二幕：应用包自带 Chromium；外部名称是 ChatGPT，内部仍保留 Codex 标识](/media/08de6927bb8b9143-5c498d23d045483e.webp)](/media/08de6927bb8b9143-5c498d23d045483e.webp)

小狐最先问的是：“这个浏览器是不是系统提供的？”小机没有先猜框架，而是打开安装目录。`Frameworks` 下存在 `Codex Framework.framework`，其中的版本目录为 `156.0.8078.48`；应用 `Info.plist` 中的 `ChromiumBaseVersion` 与它一致。

这说明内核随应用一起分发。**这里的 Electron `<webview>` 使用随包提供的 Chromium，不是 macOS 的 `WKWebView`，也不依赖另外安装的 Chrome。** “自己内置”说的是交付方式，不等于 OpenAI 从零写了浏览器内核。应用窗口、输入和系统权限仍要调用 macOS 能力。

继续读铭牌，会发现一个容易忽略的细节：显示名称是 ChatGPT，Bundle ID 却是 `com.openai.codex`；`app.asar/package.json` 的包名是 `openai-codex-electron`。因此，文章只判断眼前的安装包，不用产品名称反推它与过去版本的实现关系。

| 看到的证据 | 可以确认什么 | 不能直接推出什么 |
| --- | --- | --- |
| `openai-codex-electron`、`BrowserWindow`、`ipcMain` 调用 | 应用使用 Electron 接口 | 所有 UI 都是 Electron 默认提供 |
| 前端 bundle 中的 React runtime、Hooks 和 JSX 调用 | 应用界面使用 React | 浏览器内核由 React 实现 |
| `ChromiumBaseVersion: 156.0.8078.48` 与 Framework 版本目录 | 此安装包携带该版本的 Chromium 组件 | 这份 Chromium 完全没有补丁，或补丁清单已经明确 |
| `Resources/owl-electron-app.json` 中的 `runtimeName: "owl"` | 这个版本把运行层标识为 OWL | 它与 Atlas 的 OWL Client、Host 实现逐项相同 |

其余原生模块、构建产物与更新组件也能在包中找到，但“文件存在”和“当前功能实际运行”是两种证据；本篇只把与浏览器链路直接相关的材料放进主表。

表中的 `ipcMain` 是 Electron 主进程接收渲染进程消息的接口。界面代码可通过对应的 `ipcRenderer` 发送消息；主进程用 `ipcMain.on` 监听消息，或用 `ipcMain.handle` 处理需要返回结果的调用。它负责应用内部的跨进程通信，不负责渲染网页，也不是下文 Agent 控制页面所用的 CDP。这里查到 `ipcMain` 调用，只能作为应用使用 Electron 接口的证据；具体消息处理什么业务，仍要看对应的 channel 和处理代码。[Electron 的 `ipcMain` 文档](https://www.electronjs.org/docs/latest/api/ipc-main)列出了这两种接收方式。

## 第三幕与第四幕：把网页装进窗口，把权限留给管理层

[![第三、四幕：界面创建 webview，主进程管理网页；网页关闭 Node 集成并启用隔离配置](/media/08de6927bb8b9143-c357ff2752c0432a.webp)](/media/08de6927bb8b9143-c357ff2752c0432a.webp)

找到内核后，小狐沿着网页继续走。前端共享代码里有一个直接的入口：

```js
document.createElement(`webview`)
```

先把几个 Electron 名词说清。`BrowserWindow` 是桌面上可见的窗口；它有一个 `webContents`，表示窗口里应用自身的网页内容。`WebContents` 是主进程用来加载、控制和监听**一份网页内容**的对象，不是网页中的 DOM，也不是 Chromium 内核的别名。`<webview>` 是放在应用界面里的嵌入标签：它承载另一份网页，称为 guest；guest 也有自己的 WebContents。[Electron 的 webContents](https://www.electronjs.org/docs/latest/api/web-contents)与[`<webview>` 文档](https://www.electronjs.org/docs/latest/api/webview-tag)分别解释了控制对象和嵌入标签。

```text
BrowserWindow：桌面窗口
└─ 应用界面的 WebContents
   └─ <webview>：嵌入位置
      └─ guest WebContents：目标网页
```

这只表示界面承载关系，不是固定进程树，也不是说每个 Electron 应用都必须使用 `<webview>`。Electron 当前文档甚至建议新项目考虑其他嵌入方式；这里描述的是**这个安装包的实际选择**。同一片应用代码还维护 `browserTabId`、`conversationId`、`hostGeneration` 和 `rendererInstanceId`，用来关联标签页、对话和页面宿主。标签页怎样显示，是应用逻辑；网页怎样加载和渲染，才进入 Electron 与 Chromium 的执行层。

随后接手的是主进程中的浏览器管理逻辑。名为 `browser-sidebar-manager` 的日志标识周围，可以找到标签页状态、页面挂载与转移、恢复、后台页面预算、下载和权限提示等代码。`will-attach-webview` 与 `did-attach-webview` 事件把界面的嵌入动作连接到主进程。

主进程在 `<webview>` 附着时，为 guest 网页设置 `webPreferences`。下列是网页执行环境的配置字段摘录，**不是 `<webview>` 标签上的四个 HTML 属性**，也不是完整源码：

```js
{
  sandbox: true,
  nodeIntegration: false,
  contextIsolation: true,
  webSecurity: true
}
```

`sandbox` 限制页面执行环境，`nodeIntegration: false` 阻止普通网页直接使用 Node.js 集成，`contextIsolation` 分开 preload 与网页的 JavaScript 上下文，`webSecurity` 保留网页安全检查。主进程还为浏览器页配置 Session 和 `browser-page-preload.js`；preload 是应用向页面提供受控桥接能力的位置，可以支撑批注等功能，不意味着网页因此拥有任意 Node 权限。[Electron 安全指南](https://www.electronjs.org/docs/latest/tutorial/security)说明了这些设置的用途。看到四个布尔值只能说配置了隔离措施，不能宣称整套浏览器已经通过安全审计。

后续提供的界面截图还显示了右上角菜单和“设置 → 浏览器 → 扩展程序”页面。菜单里的查找、打印、下载、缩放，以及扩展管理页的搜索、开发者模式和商店入口，属于**用户看到的产品界面**。它们可以由应用界面与 Electron/Chromium 已有能力组合实现；只看到菜单和设置页，无法定位实现究竟在 React、主进程、OWL 接口还是 Chromium 补丁。OpenAI 的[桌面内置浏览器说明](https://help.openai.com/en/articles/20001277-using-the-built-in-browser-in-the-chatgpt-desktop-app)确认产品提供扩展等能力，但实际可用性仍受版本、账号和工作区设置影响。

“网页与应用权限分开管理”也不是说有两套完全无关的权限系统。更准确的说法是：网页代码先受 sandbox、同源策略和 Node 集成配置约束；站点访问、下载、扩展与 Agent 使用页面，再经过应用的 Session、提示和策略管理。前一层限制页面能做什么，后一层决定产品是否允许这次操作。它们会相互配合，但截图和这组配置不足以证明每一种权限提示具体在哪个源码层实现。

这里还有两个容易混淆的边界：

| 看起来相近的概念 | 本次代码支持的结论 |
| --- | --- |
| 标签页归属于某个对话 / 每个对话拥有独立 Cookie | 前者有路由和标识证据；代码会配置浏览器 Session，不能仅凭 `conversationId` 推断后者 |
| `WebContentsView` / `<webview>` | 包内都出现过；查到的 `WebContentsView` 用于下载辅助逻辑，浏览器页面宿主明确创建了 `<webview>` |

所以，“用了 Electron”只是第一层答案。网页如何保存、何时挂载、怎样转移、权限由谁处理，都属于应用额外实现的管理逻辑。

## 第五幕与第六幕：Agent 接入页面，调查停在证据边界

[![第五、六幕：Agent 经 CDP 控制页面 WebContents；Owl 的接管接口可见，完整底层补丁仍未知](/media/08de6927bb8b9143-eb6d9546e78dbc24.webp)](/media/08de6927bb8b9143-eb6d9546e78dbc24.webp)

小狐接着问：“Agent 操作的是另一台浏览器，还是眼前这张网页？”这里的 CDP 是 **Chrome DevTools Protocol**，即向 Chromium 页面发送调试与控制命令的协议。静态代码能追到一条路径：Browser Use 后端经过会话路由，找到页面的 WebContents，再使用 Electron 的 debugger 接口发送 CDP 命令。这说明它**具备接入当前应用页面的代码路径**，不是一次已完成真实任务的运行记录。

将压缩后的变量名换成含义明确的名称，可以看到这两个关键调用：

```js
webContents.debugger.attach(`1.3`)
webContents.debugger.sendCommand(/* CDP 方法与参数 */)
```

主进程还包含 `Target.attachToTarget`、`Target.getTargets`、子 Session、控制权释放和超时处理。因此，这不是只有一个“执行浏览器命令”的按钮；它需要维护任务与页面的归属，并处理控制过程的生命周期。

这条集成路径把 Agent 请求接到应用承载的页面。**本次没有运行真实任务**，不能据此宣称所有操作都成功、前后台表现一致，或全部浏览器工具都采用这一后端。包内还能看到其他浏览器后端的标识，不能把它们与内置浏览器混为一谈。

调查的最后一扇门写着 OWL。安装包 `Resources/owl-electron-app.json` 将 `runtimeName` 标为 `owl`；前端宿主还出现了这些属性名，页面代码中有对应的转移方法：

```text
owl-webcontents-adoption-lease
owl-webcontents-adopted-web-contents-id
adoptForWindowTransfer
```

它们与页面接管、窗口间转移逻辑同时出现；构建引用中也保留了 `owl-shell.mjs` 和 `ensure-owl-electron-types.mjs`。这些证据支持“该版本存在名为 OWL 的运行层，并为页面接管与转移提供了定制接口”。接口可能在应用层、Electron 层或更底层实现；名字本身不提供补丁位置。

但铭牌和接口没有交出完整施工图。**具体修改了哪些 Chromium/Electron 源码、对应哪个上游 Electron 版本、迁移时有哪些限制，仍不能从这次检查中确定。** 漫画里把网页搬到另一扇窗口，只表达代码中的转移意图，不冒充已验证的无损迁移效果。

## OWL、Atlas 与“改内核”：把三个问题分开

OpenAI 把 OWL 展开为 **OpenAI’s Web Layer**。在[《How we built OWL》](https://openai.com/index/building-chatgpt-atlas/)中，它讲的是独立浏览器 **ChatGPT Atlas**：原生应用侧的 OWL Client 通过 Mojo 与承载 Chromium 浏览器进程的 OWL Host 通信。Client 提供 Session、Profile、WebView 等调用接口，Host 负责浏览器执行。因此，OWL 不只是一个给开发者导入的 SDK；“runtime”强调它在运行时承载的执行能力。这里的 **OWL WebView** 也是 Atlas 架构里的接口概念，不能直接等同于上文的 Electron `<webview>` 标签。关于 SDK 与 Runtime 的一般区别，另见[《漫画拆解 Runtime 与 SDK：从调用接口到真正运行》](/blog/88cddc5b581be236)。

**Electron 技术栈允许维护 Chromium 补丁；OpenAI 也明确说明 Atlas 的 OWL 与上游 Chromium 存在差异。** [Electron 的补丁指南](https://www.electronjs.org/docs/latest/development/patches)说明了上游补丁及其维护成本；OpenAI 则说 Atlas 的 Chromium 差异集较小、OWL 在内部作为预编译二进制交付。这两份材料足以回答“能不能打补丁”和“Atlas 有没有做 Chromium 定制”，却仍不能列出**这份 ChatGPT 26.1023.51421 安装包**的补丁清单，也不能证明桌面版沿用 Atlas 的 Swift Client/Host 进程结构。

Atlas 与 ChatGPT 桌面内置浏览器是不同产品。[Atlas 公告](https://openai.com/index/introducing-chatgpt-atlas/)现已标注该产品弃用；[桌面内置浏览器帮助文档](https://help.openai.com/en/articles/20001277-using-the-built-in-browser-in-the-chatgpt-desktop-app)描述的是当前桌面应用的浏览能力。共享 OWL 名称是线索，**不是两个产品实现完全相同的证明**。至于“OWL 开源了吗”，截至 2026 年 11 月 2 日，本次未找到 OpenAI 官方发布的 OWL 源码仓库、许可证或可安装的外部 SDK；公开架构文章也不等于开源发布。因此，现阶段不把 OWL 称为已开源项目。

## 把线索放回原位：下次可以怎样检查

判断一个桌面应用的浏览器集成，可以沿着“分发物、页面宿主、管理逻辑、控制通道”四步走。再问每条证据来自安装包静态检查、产品实际操作，还是厂商对另一产品的公开陈述；同一个技术名不自动消除来源差异。

下面两条只读命令足以复核本次最核心的内核证据：

```bash
/usr/libexec/PlistBuddy -c 'Print :ChromiumBaseVersion' \
  /Applications/ChatGPT.app/Contents/Info.plist

ls '/Applications/ChatGPT.app/Contents/Frameworks/Codex Framework.framework/Versions'
```

还可以只读查看 `Resources/owl-electron-app.json` 的 `runtimeName`。它证明这一版包使用了 OWL 标识；若要确认扩展能否真正加载、下载权限怎样触发、窗口转移是否无损，则需要在相同版本中执行对应任务并观察结果。若要确认具体 Chromium 补丁，还需源码、构建记录或能够排除应用层实现的二进制对照。

更深入的结论来自 `Resources/app.asar`。以下路径均相对于该归档；带哈希的文件名属于本次版本，升级后可能变化。

| 归档内位置 | 本次查到的线索 |
| --- | --- |
| `package.json` | 应用包名、版本、入口、依赖和构建脚本引用 |
| `webview/assets/app-shared-e9f258fd3588.js` | 创建 `<webview>`、宿主标识、Owl 接管属性 |
| `.vite/build/main-UOTY8NmV.js` | 浏览器管理、Session、安全配置、debugger 与 CDP 调用 |
| `.vite/build/browser-page-preload.js` | 浏览器页面的 preload 产物 |
| `webview/assets/page-ce7ec66128b2.js` | 页面宿主、窗口转移准备与接管调用 |

这次检查把“内置浏览器”拆成可回查的四层：**随应用分发的 Chromium，承载网页的 `<webview>`，管理生命周期的主进程，以及连接 Agent 的 CDP 通道。** OWL 标识和定制接口位于这条链路中；Atlas 的公开工程文章补充了 OWL 的设计背景，但没有替这份安装包交出底层补丁清单。

### 可回查资料

- [OpenAI：How we built OWL](https://openai.com/index/building-chatgpt-atlas/)：Atlas 的 OWL Client、Host、Mojo、Chromium 差异与内部二进制交付。
- [OpenAI：桌面应用内置浏览器](https://help.openai.com/en/articles/20001277-using-the-built-in-browser-in-the-chatgpt-desktop-app)：当前产品的浏览、扩展、下载和权限说明。
- [OpenAI：Introducing ChatGPT Atlas](https://openai.com/index/introducing-chatgpt-atlas/)：Atlas 产品及弃用标识。
- [Electron：`ipcMain`](https://www.electronjs.org/docs/latest/api/ipc-main)、[webContents](https://www.electronjs.org/docs/latest/api/web-contents)、[`<webview>`](https://www.electronjs.org/docs/latest/api/webview-tag)、[安全指南](https://www.electronjs.org/docs/latest/tutorial/security)、[补丁指南](https://www.electronjs.org/docs/latest/development/patches)：进程通信、网页承载、安全设置与上游补丁机制。
