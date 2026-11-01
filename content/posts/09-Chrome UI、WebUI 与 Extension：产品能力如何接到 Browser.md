---
id: "d25d0d5dd8ee92dd"
title: "09-Chrome UI、WebUI 与 Extension：产品能力如何接到 Browser"
description: "从源码阅读入口、进程边界与验证条件理解Chrome UI、WebUI 与 Extension：产品能力如何接到 Browser。"
date: null
topic: "principles"
tags: []
collection: "docs"
cover: "/media/d25d0d5dd8ee92dd-d630d7c9c484eebb.webp"
---

从源码阅读入口、进程边界与验证条件理解Chrome UI、WebUI 与 Extension：产品能力如何接到 Browser。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

![Chromium 产品 UI、Extension 与 Runtime 边界封面](/media/d25d0d5dd8ee92dd-d630d7c9c484eebb.webp)

> 阅读坐标沿用原稿：Chromium `153.0.8010.37`，上游 commit `b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b`。本次同步未重新进行源码与目标平台运行时验收。

![Chrome UI、WebUI、Extension 与 Runtime 的产品接入边界](/media/d25d0d5dd8ee92dd-6546b20b0c646f22.webp)

## 一句话结论

Chrome UI、WebUI、Extension 和 Browser Native capability 不是四种可以随意互换的前端形态：它们拥有不同身份、权限和生命周期，产品能力应由 Browser 侧受限 contract 统一裁决，再把长期任务交给对应 Runtime。

浏览器产品功能经常长得像一个网页：设置页、侧边栏、下载页、扩展 popup、AI 面板都可能用 HTML/TypeScript 绘制。但“用 Web 技术做 UI”不等于它们拥有网页权限。Chrome UI、WebUI、Extension 和普通网页分别处在不同 origin、进程、生命周期和授权模型中；真正可以读取 Profile、控制 Tab、调用本机能力的决定通常仍在 Browser 侧。

这一章的阅读目标不是背下所有 UI 框架，而是能回答：**界面属于哪个信任域？它怎么得到一个 `WebContents` 或 API？Browser 在哪里复核身份、权限与生命周期？**

## 一张产品接入图

```text
Native Views / 地址栏 / 菜单 / 快捷键
  -> Browser command / controller
  -> Browser、Profile、WebContents 与权限决策
  -> WebUI controller / Extension API / Browser Native capability contract
  -> Mojo、message handler 或受限资源接口
  -> renderer 中的 WebUI / Extension page / content script
  -> 用户可见 UI

普通网页
  -> Web 标准 API、origin policy、Browser-side permission gate
```

这条图里的箭头不是“所有调用都先经过 Chrome UI”。页面脚本可以发起 Extension API，Extension 可以驱动 Tab，WebUI 可以直接向 Browser handler 发消息；共同点是高权限能力不应由 Renderer 传来的任意字符串直接决定。每条路径都需要知道调用者身份、目标 `WebContents`/frame、Profile、权限和取消条件。

## `WebContents`：产品 UI 与页面内容共享的生命周期坐标

`content::WebContents` 是 Chromium 为“可呈现浏览内容”提供的高层抽象。Tab、popup、WebUI 或嵌入内容可能各自拥有或关联一个 `WebContents`；它连接导航、主 frame、BrowserContext、view、delegate 和 observer 等概念，但不等价于一个 Renderer process 或一个永久 document。

| 概念 | 它解决的问题 | 不能误写成 |
| --- | --- | --- |
| `WebContents` | 让产品层持有一段浏览内容及其可观察生命周期 | 一个稳定不变的页面 DOM 或一个固定 Renderer |
| `BrowserContext` / Profile | 为内容提供用户状态、Storage Partition、权限与服务归属 | 只是一份配置文件 |
| `WebContentsObserver` | 在导航、销毁、加载、frame 状态变化时观察生命周期 | 可绕过 owner 永久保存裸指针 |
| `WebContentsDelegate` | 让产品层处理打开 URL、焦点、窗口等宿主决策 | 任意 renderer 都能直接控制窗口 |

阅读一个产品功能时，先问它持有的是 `WebContents`、主 frame、特定 `RenderFrameHost`，还是仅一个 tab id。答案决定导航、跨站进程切换、关闭 Tab 或 BFCache 后哪个引用必须失效。把功能绑定到“当前页面 URL”而不保存正确 owner，是 UI 偶现串台、旧页面回调和权限错用的常见来源。

## Chrome UI：原生壳负责产品动作，不替网页越权

地址栏、Tab strip、菜单、快捷键、窗口和许多 side panel 宿主属于 Chrome 产品层。阅读命令型功能通常从 `chrome/browser/ui/browser_commands.*`、`BrowserCommandController`、action/菜单注册开始，再向下跟踪它如何选择当前 `Browser`、`WebContents`、Profile 和目标 service。

Native Views 与 Web 内容的职责不同：前者擅长窗口、焦点、输入、菜单和产品壳；后者适合快速迭代信息架构和交互。实际产品往往把二者组合，但不应因为一个按钮最终显示 HTML，就把 Browser 决策搬进 renderer。比如“对当前 Tab 执行高权限动作”的安全输入至少是 Browser 侧重新取得的 target tab/frame、当前 Profile 和明确用户授权，而不是 UI 传来的一段 URL 或 tab id 字符串。

## WebUI：受控 origin 下的产品 Web 页面

WebUI 是 Chromium 用来实现 `chrome://` 与相关内部页面的一套机制，而不是普通网站的特权模式。一个页面通常涉及四件相互独立的事：URL/配置注册、资源供给、Browser controller/handler、前端到 Browser 的接口。

| 层 | 基线入口 | 阅读时要核对 |
| --- | --- | --- |
| 配置与 controller 选择 | `content/public/browser/webui_config.h`、`webui_config_map.*`、`web_ui_controller_factory.*` | 哪个 host/origin 能创建该 controller，是否按 Profile/feature 限制？ |
| 页面资源 | `WebUIDataSource`、`content/browser/webui/web_ui_url_loader_factory.cc` | HTML/JS/strings/images 从何处提供，是否暴露不该给此 origin 的资源？ |
| Browser handler | `WebUIController`、`WebUIMessageHandler`、`WebUIImpl::AddMessageHandler()` | handler 的 owner、调用参数校验、WebContents/Profile 生命周期是什么？ |
| 前端接口 | message、Mojo 或 browser-interface broker | 谁可以调用、错误/断连如何回到页面、页面导航后接口是否失效？ |

`WebUIConfigMap` 会按 URL origin 查找配置；`WebUIImpl` 负责处理页面消息并持有 handler。这说明 WebUI 的权限不是由前端 bundle 的文件路径决定，而由实际 URL、controller 创建、Browser-side handler 和接口绑定共同决定。只看一个 TypeScript `send()` 或一个 C++ handler 都不足以说明安全边界。

### `chrome://` 与 `chrome-untrusted://` 不是装饰性前缀

需要加载更不可信内容、第三方脚本或受限渲染资源的产品页面，不能仅凭“代码来自本仓库”就把它放进高信任 WebUI。Chromium 为 trusted/untrusted WebUI 分开配置和 origin；`WebUIConfigMap` 也有 `AddUntrustedWebUIConfig()` 入口。两种页面如何通信、是否共享 renderer、能否直接得到 Browser interface，都必须在具体实现中验证。

正确的设计问题是：这段前端是否应直接获得高权限 Browser capability？若答案不是明确的“应当”，默认放到更低信任域，再通过窄接口让 Browser 逐项裁决。把 `chrome-untrusted://` 页面当作普通 `chrome://` 页面来添加 message handler，或在 handler 中只相信前端传来的 origin/tab id，会打穿这种分层。

## Extension：声明能力、运行身份与 Browser 执行分开

Extension 不是一个普通网页脚本包。它有 manifest、稳定 extension id、install/update 生命周期、background/service worker、extension page、content script 和 API 权限；它也可能跨多个 Tab 与 frame 工作。页面实际执行的位置并不改变 Browser 对其能力的最终裁决。

Chromium 基线中可从 `extensions/browser/extension_registry.*` 看安装/启用状态，从 `ExtensionFunction`、`ExtensionFunctionRegistry` 和 `ExtensionFunctionDispatcher` 看 API 如何在 Browser 侧被登记与分派。一个 Extension API 的阅读至少要跨四层：

1. manifest/API schema：调用者声明了什么 permission、host permission 或可选能力；
2. extension runtime：哪个 extension、document、service worker 或 content script 发起调用；
3. dispatcher/function：Browser 如何找 handler，如何关联 extension identity、Profile 与 request 生命周期；
4. 实现与 policy：实际操作谁拥有，权限、用户手势、incognito、Tab/frame/origin 和错误结果如何检查。

因此“Extension 有一个 API”不能推出“任意页面都能调用”或“拥有该 permission 就能无条件操作所有 Tab”。同一个 API 的可用性还可能受 manifest version、host match、用户授权、企业 policy、incognito 模式、当前 frame 与浏览器版本影响。代码评审应沿 identity 和 policy 一直追到 Browser-side implementation，而不是在 API 名称处停止。

## Browser Native capability：把产品需求写成受限契约

| 契约字段 | 应回答的问题 |
| --- | --- |
| Caller identity | 是哪个 extension id、WebUI origin、Profile、用户还是系统任务在请求？ |
| Target | 作用于哪个 Browser/`WebContents`/frame/下载项；它仍存在且仍属于该 caller 吗？ |
| Authorization | manifest/host permission、用户手势、显式确认、企业 policy 和 incognito 规则怎样叠加？ |
| Data boundary | 可以读/写哪些 URL、页面文本、文件、cookie 或 native resource？哪些字段必须由 Browser 重新取得？ |
| Lifetime | 导航、Tab 关闭、extension unload、profile 销毁、permission revoke 后如何取消和清理？ |
| Result | 成功、拒绝、取消、断连与部分完成分别如何返回和记录？ |

这个 contract 可以通过 Mojo、Extension function、WebUI handler 或已有 Browser service 实现；传输技术不是第一决策。只要 Browser 侧明确复核 caller、target 和授权，未来从同进程 handler 拆为 service 也不会重写安全语义。

## 一个可执行的阅读与排障路径

以“用户点击侧边栏按钮，Extension 请求读取当前 Tab 的受限信息并展示结果”为例：

```text
侧边栏按钮 / extension page
  -> extension API 或 WebUI 前端调用
  -> Browser-side dispatcher / handler
  -> 查 caller identity、Profile、当前 target WebContents/frame
  -> 复核 permission、host/origin、用户确认与生命周期
  -> 调用 Browser Native capability 或受限服务
  -> 结果经 callback/Mojo 回到原调用上下文
  -> 页面仍有效时渲染；导航/关闭/撤销则明确取消
```

排障时分别捕获 UI action、Browser handler/dispatcher、权限拒绝原因、目标 tab/frame 生命周期和回调结果。只在 DevTools Console 看见前端报错，无法分辨是资源加载、WebUI origin、Extension permission、Browser policy 还是异步 target 已失效。

## 本文已核验的源码锚点

| 主题 | 源码入口 |
| --- | --- |
| Tab/内容所有权 | `content/public/browser/web_contents.h`、`web_contents_observer.h`、`web_contents_delegate.h` |
| WebUI 接口和注册 | `content/public/browser/web_ui*.h`、`webui_config_map.*`、`content/browser/webui/web_ui_impl.*`、`web_ui_main_frame_observer.*` |
| WebUI 资源 | `content/public/browser/web_ui_data_source.h`、`content/browser/webui/web_ui_url_loader_factory.cc` |
| Chrome 产品命令 | `chrome/browser/ui/browser_commands.*`、`browser_command_controller.*` |
| Extension API dispatch | `extensions/browser/extension_function.*`、`extension_function_dispatcher.*`、`extension_function_registry.*`、`extension_registry.*` |

## 运行时验证路径

- 选一个 `chrome://` 页面和一个 `chrome-untrusted://` 页面，记录 controller 配置、resource source、可调用 Browser interface 与跨域/导航限制。
- 选一个 Extension API，从 manifest 到 `ExtensionFunctionDispatcher` 与最终实现做端到端 trace；分别测试允许、拒绝、host 不匹配、Tab 关闭和 extension reload。
- 在 macOS 和 Windows 各验证一个 Native Views/WebUI 组合入口，区分产品 UI 平台差异与共享 Browser-side policy。

## 选型推演：同一个面板为什么不能只看前端技术栈

如果只是展示受控的 Browser 设置或状态，WebUI 可以复用 Web 技术并由专属 controller/data source 提供能力；若需要跟随窗口、菜单、系统对话框或原生焦点体系，Views/平台 UI 更合适；若能力需要独立版本、页面注入和业务快速迭代，可放在内置 Extension；若涉及文件、调试、设备或跨 Profile 高权限执行，则必须回到 Browser-owned handler。

选型判断不应是“React 好写还是 C++ 好写”，而应比较身份、权限、生命周期、发布频率和失败隔离。WebUI 页面也是 Renderer 内容，不能因为使用 `chrome://` 就把不可信参数直接交给高权限实现；Extension 也不能因为内置就绕过 manifest、caller 和 document 校验。

## 先按能力所有权选接入形态

面对一个产品面板，可以用四个问题筛选形态：是否需要平台原生窗口行为，内容是否应与普通 Web 隔离，是否需要跨站点注入，后台任务是否允许被回收。答案比团队熟悉 React 还是 Views 更重要。

| 需求 | 更合适的起点 | 原因 |
| --- | --- | --- |
| 地址栏、Tab strip、系统菜单、原生快捷键 | Chrome UI / Views | owner 是 Browser window 与平台 UI |
| 设置页、受控内部页面、诊断面板 | WebUI | 受控 origin 与 Browser handler 易于约束 |
| 跨页面内容脚本、声明式权限、独立更新 | Extension | manifest、host permission 与 Extension lifecycle 已定义 |
| 长期 Agent loop、Tool/MCP 与可恢复 session | Runtime/Runtime | 不依赖 UI document 或 MV3 worker 常驻 |

混合方案很常见：Views 提供侧边栏容器，WebUI/Extension 提供前端，Browser 暴露最小 capability，Runtime 执行长任务。混合并不意味着所有层都能互相直接调用；每一条跨层边界仍要有身份和取消语义。

## WebUI 的网页外观不代表网页权限

WebUI 通常由 Browser 注册 controller、data source 与 message handler，并运行在受控 scheme/origin 下。它可以使用 HTML/CSS/JavaScript 构建界面，但资源来源、CSP、接口和可导航范围应由 Browser 明确限制。

WebUI handler 不应因为页面是“内部页”就接受任意字符串执行高权限动作。应在注册时绑定 Profile/WebContents context，对消息做 schema、状态和能力校验；页面销毁后取消 pending callback。若 WebUI 能嵌入远端内容，还要特别防止远端 frame 获得内部页面的 message channel。

## Extension 权限要在安装、调用和目标三层成立

Manifest permission 表示扩展声明能力，host permission 表示可作用站点范围，Browser API 调用还要验证当前 Extension identity、Profile、tab/frame/document 与用户手势等条件。三层中任何一层不成立，都不应仅凭 content script 已注入就放行。

MV3 service worker 会回收和重启，内存变量不是可靠状态；content script 会随 document 替换；Port 会断开；Tab ID 会复用或指向新 document。产品设计若要求“后台永远在线”，应把可恢复长任务交给明确 Runtime，而不是用 keepalive 技巧抵抗平台生命周期。

## Browser Native capability 应像小型协议设计

一个给 WebUI/Extension 的 Browser capability，最好明确写出：

- caller 类型与允许的 Extension/WebUI identity；
- 输入 schema、大小、敏感字段和最小化规则；
- 目标 Profile、Tab、frame/document 与用户确认条件；
- request id、deadline、取消和幂等语义；
- Runtime/OS 失败如何映射为稳定错误；
- 接口版本与旧 Extension/旧 Browser 的兼容策略；
- 日志允许记录什么，哪些内容必须脱敏。

这比直接暴露一个 C++ service object 更重要。产品迭代会让 UI、Extension、Browser 和 Runtime 分别升级；没有显式协议，兼容判断只能隐藏在 if/else 和版本猜测里。

## 从一个“读取页面并执行动作”的需求拆边界

假设 AI 面板要读取当前页面选区、调用 Agent，再根据结果点击或填写页面。可以拆为：content script 获取当前 document 的受限上下文；Browser 验证 Extension、Tab/frame/document 与 capability；Runtime 建立 session 并调用 Tool；执行结果回到原 request；真正页面动作再次检查目标 document 和权限。

如果期间导航，原选区和 DOM locator 应失效；如果 worker 回收，session 仍应由 Runtime 恢复或明确失败；如果 Browser 升级而 Extension 未升级，双方要通过 contract version 拒绝不兼容调用，而不是产生静默错误。

验证矩阵至少覆盖普通网页、跨 origin iframe、受限 scheme、无权限站点、导航中、Tab 关闭、worker restart、Runtime disconnect 和旧版本组合。正常页面上成功一次，只证明 happy path 接通。

## 产品 UI 还要承受升级中的版本错位

Browser、WebUI 资源、Extension 与 Runtime 可以独立更新，用户又可能在升级时保留已打开页面。接口应在连接或首次调用时交换 capability/version，明确旧页面是否需要 reload、旧 Extension 是否降级、新 Runtime 能否兼容。静默假设“所有组件同时刷新”会把发布竞态变成偶发 UI 故障。

## 工程结论

产品接入面决定 UI 在哪里实现，capability contract 决定谁能做什么。两者分开后，界面可以在 WebUI/Extension/Views 之间演进，而安全裁决、Profile 隔离和 Runtime 边界不必随 UI 重写。

## 继续阅读

- [08-Compositor、Viz、Skia 与 GPU：一帧如何真正到达屏幕](/blog/636da0fdc5bcbe17): 相邻章节的前置机制。
- [10-安全、存储与身份边界：谁能代表哪个站点、读到哪份数据](/blog/b577f62efe84363c): 相邻章节的后续机制。

## 上游源码入口

文中的相对源码路径可从 [Chromium 官方上游快照](https://chromium.googlesource.com/chromium/src/+/b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b/) 定位。此入口保留原稿的上游阅读坐标，不包含任何产品定制代码，也不替代运行时验收。
