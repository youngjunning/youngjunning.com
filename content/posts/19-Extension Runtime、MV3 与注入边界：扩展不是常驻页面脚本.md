---
id: "0a08e5b4f498a778"
title: "19-Extension Runtime、MV3 与注入边界：扩展不是常驻页面脚本"
description: "从源码阅读入口、进程边界与验证条件理解Extension Runtime、MV3 与注入边界：扩展不是常驻页面脚本。"
date: null
topic: "principles"
tags: []
collection: "docs"
cover: "/media/0a08e5b4f498a778-2269fad436460ada.webp"
---

从源码阅读入口、进程边界与验证条件理解Extension Runtime、MV3 与注入边界：扩展不是常驻页面脚本。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

![Chromium Extension Runtime、MV3 与注入边界封面](/media/0a08e5b4f498a778-2269fad436460ada.webp)

> 阅读坐标沿用原稿：Chromium `153.0.8010.37`，上游 commit `b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b`。本次同步未重新进行源码与目标平台运行时验收。

![MV3 Extension 从事件唤醒到受限 Browser 能力的生命周期](/media/0a08e5b4f498a778-8b1fd0d8563fa971.webp)

## 一句话结论

MV3 Extension 是事件驱动、可暂停、会重启的受限调用者；content script、service worker、Extension UI 与 Browser handler 各有独立身份和生命周期，任何长期 Agent 状态都不应偷放在扩展内存里。

Extension 接到 Chrome UI 与 Browser Native capability 后，仍要面对它的运行时现实：MV3 background service worker 可以被唤起、挂起并重启，content script 与网页同处 Renderer 却不等于网页自身，消息端口和 API 调用跨越多个身份边界。把 Extension 当作“永远在线的 Node 服务”，是大量偶现丢状态、重复执行和权限绕过问题的根源。

## 四个执行位置，四份不同的身份

```text
Extension UI (popup/side panel/options)
  -> extension service worker (可被启动/终止)
     -> Browser Extension APIs / EventRouter / FunctionDispatcher
        -> content script (注入特定 frame/world)
           -> page DOM / webpage script
```

| 位置 | 最适合负责 | 不能默认拥有 |
| --- | --- | --- |
| popup/side panel | 用户可见交互、确认、短生命周期 UI | 常驻后台状态、任意网页 DOM、Browser 特权 |
| MV3 service worker | 事件驱动状态协调、API 调用、消息路由 | 永不退出的内存、可靠计时器、用户已确认的权限 |
| content script | 受 host/frame 约束的 DOM 读写与页面桥接 | 任意 origin、Extension API 的全部权限、网页 JS 的信任 |
| Browser API/Native handler | 受验证的扩展 caller 与 Browser-owned 能力 | 把业务 Runtime 或网页输入直接视为可信 |

`ExtensionRegistry` 管理已加载/启用/禁用扩展，`ExtensionFunctionDispatcher` 路由 API 调用，`EventRouter` 分发事件；这些入口证明 Extension API 不是页面函数直接跳进 C++，而要经过 Browser 侧的扩展身份、权限与生命周期判断。

## MV3 service worker：重启是正常语义

`extensions/browser/service_worker/` 中的 task queue、host、state 和 keepalive 实现，表明 Browser 需要协调事件到达、worker 启动与可用性。正确设计不能依赖 worker 内存永久存在：任何请求都可能在下一次事件中面对一个刚启动的 worker；任何尚未持久化的状态都可能丢失。

| 常见设计 | 为什么会失败 | 正确替代 |
| --- | --- | --- |
| 全局变量保存会话/待处理任务 | worker 终止后消失 | 以显式持久化状态、request id 与可恢复状态机表示 |
| `setTimeout` 当可靠调度器 | lifecycle/节流/重启会打断 | 使用合适 Browser/产品调度能力，并设计补偿/重试 |
| 一个长连接假定永不断 | port/worker/Tab/Runtime 都会断 | 处理 reconnect、idempotency、cancel 与版本协商 |
| 事件处理到一半直接写 UI | popup 已关闭或页面已导航 | 检查 target/document，保存可重放结果或安全丢弃 |

keepalive 是为了让特定工作完成的机制，不是把 worker 改回常驻进程的权限。需要长期 Agent 运行、子进程、MCP session 或高频任务时，应归对应 Runtime；Extension 只保存 Browser UI 和受限 capability 的边界。

## content script：能看到 DOM，不等于获得网页身份

manifest 的 content script 由 `content_scripts_handler.*` 解析，Renderer 的 `script_injection_manager.*`/`script_injection.*` 决定何时向哪个 frame 注入。注入目标依赖 URL/host permissions、match pattern、frame、document 与执行 world；跨站 navigation 后旧 frame 上的对象和 DOM reference 都必须失效。

content script 常需要在 isolated world 与网页 world 之间桥接。正确的安全模型是：网页通过 DOM event/`postMessage` 传来的数据都是不可信输入；Extension 不能因“脚本在该网页里运行”就把网页参数当作已认证操作。向 Browser Native API 发起调用前仍需验证 extension identity、tab/frame/document、origin/host permission、用户确认和数据范围。

## Messaging：端口建立不是授权完成

`extensions/common/api/messaging/` 和 Browser/Renderer messaging 实现处理 one-shot message、Port、endpoint 与 native messaging 等路径。消息至少要绑定发送端、接收端、Extension ID、tab/frame/document、生命周期和错误/断开语义；仅以一个自定义 `type` 字段区分能力是不够的。

```text
page (untrusted) -> content script -> extension worker
  -> Browser capability / Runtime request
  -> result tied to request + current document
  -> content script -> page only after explicit filtering
```

特别是把 Agent 结果回写网页时，不能让旧请求覆盖新导航页面，也不能将 Runtime 断线后的重试理解为可以重复执行高风险操作。每个消息至少应有 request id、caller context、deadline、cancel 与幂等语义；高风险能力还需要用户确认和审计。

## 验证任务与源码锚点

| 主题 | 源码入口 |
| --- | --- |
| 扩展注册与 API 路由 | `extensions/browser/extension_registry.*`、`extension_function_dispatcher.*`、`event_router.*` |
| MV3 worker 生命周期 | `extensions/browser/service_worker/service_worker_task_queue.*`、`service_worker_host.*`、`service_worker_keepalive.*` |
| content script | `extensions/common/manifest_handlers/content_scripts_handler.*`、`extensions/renderer/script_injection*` |
| 消息通道 | `extensions/common/api/messaging/`、`extensions/browser/api/messaging/`、`extensions/renderer/api/messaging/` |

- 在 reload、worker restart、popup close、Tab close、跨站 navigation、OTR 与 Runtime disconnect 中测消息、状态恢复和重复执行。
- 覆盖 host permission allow/deny、iframe、恶意网页消息、旧 document late reply、Extension disable/update/ID 变化。
- 在 signed Distribution 上验证 manifest/CRX、policy、Browser Native capability 与真实旧客户端升级；本地 unpacked extension 成功不能替代发布验收。

## 工程推演：把一个长任务放进 MV3 service worker 会发生什么

假设 Extension 收到网页消息后启动一个可能持续十分钟的 Agent 任务，并把进度只保存在 worker 全局变量里。正常开发调试时 worker 可能一直存活，看起来链路没有问题；进入真实用户环境后，worker 可被回收、Browser 可重启、Runtime 可断线、Tab 可导航。任何一个事件都会让“内存中的会话”与真实任务分叉。

更稳妥的状态机应把扩展当作可重建协调层：worker 收到事件后创建 request id，将必要上下文和当前 document identity 写入可恢复状态；长期执行交给 Runtime；进度更新可重复消费；worker 重启后通过 request id 查询状态；导航、Tab 关闭或用户取消时显式发送 cancel；最终 reply 只有在 caller/document 仍匹配时才展示。

| 状态 | Extension 要做什么 | 不能依赖什么 |
| --- | --- | --- |
| Event received | 验证 sender、permission 与目标 document | worker 已有旧内存 |
| Runtime running | 持久化 request id，允许重连查询 | Port 永不掉线 |
| Worker restarted | 恢复未完成请求的最小索引 | 重放高风险操作一定安全 |
| Navigation/close | 使 document-bound 请求失效或取消 | Tab ID 永远代表同一页面 |
| Reply arrived | 再次校验 caller 与时效 | “是自己发出的请求”就必然可展示 |

## MV3 worker 应从任意一次事件重新建立工作状态

Service worker 可以在空闲后回收，也可能因更新、崩溃或 Browser 重启重新创建。可靠实现不能假设 module-level variable、timer、open Port 或 in-memory queue 永远存在。每次事件到达时，应从持久化/Browser/Runtime 读取最小必要状态，并能识别重复事件和未完成任务。

持久化也不能变成把所有运行对象 JSON 化。应保存可恢复的 intent、run/session id、阶段和幂等 key；DOM node、Port、execution context 和 native handle 只能在当前生命周期使用。恢复时先核验 Tab/frame/document 是否仍有效，再决定继续、重建还是取消。

## Content script 同时处在页面附近和权限边界外

Content script 可以在 isolated world 中访问 DOM，并通过 message 调用 Extension 能力；页面脚本和 content script 可能共享 DOM，却不共享 JavaScript global 与身份。向页面注入 script、使用 `window.postMessage` 或 DOM event 建 bridge 时，必须把页面消息当不可信输入。

Bridge 应定义 direction、schema、nonce/request id、允许 origin/document、payload 上限和超时。页面能构造相同 DOM event，不代表它获得 Extension identity；content script 也不能把来自 Browser 的高权限结果无过滤地写入页面 global。

## Messaging 要区分连接、授权与任务

`sendMessage`/Port 建立只证明 transport 可用。Browser handler 仍要验证 sender Extension、Profile、Tab/frame/document、permission 与 capability allowlist；长任务还要建立独立 run/session，不把 Port 生命周期当业务生命周期。

Port 断开时，可能是 worker 回收、frame 导航、Tab 关闭或对端异常。调用方要得到可分类错误；Runtime 任务若仍可继续，应由 session 查询恢复结果，而不是无限重连同一个失效 Port。

## Extension 更新会同时改变多个执行位置

新版本安装/激活后，已有页面中的旧 content script、旧 worker、Browser 侧注册和新资源可能短时间并存。接口必须考虑 version skew：旧页面发来的 message 能否被新 worker/Browser 理解，新 worker 是否能处理旧 storage schema，更新后是否需要提示页面刷新。

Distribution 内置 Extension 还涉及 signed CRX、update feed/channel 与旧客户端。上传 CRX 不等于 feed 生效，本地加载 unpacked Extension 也不证明旧 Browser 能从生产 feed 升级。版本、hash、compatibility 和真实 upgrade 要分别验收。

## Runtime 承接的是可恢复长任务，不是扩展权限

将 Agent loop、Tool/MCP 和长 session 放进 Runtime，可以避免依赖 worker 常驻，但不能让 Runtime 绕过 Browser。Extension 发起 capability，Browser 验证 caller/document 和用户意图，再把受限请求交给 Runtime；Runtime reply 回来后，Browser/Extension 还要验证原 request 是否有效。

Runtime restart 时可按 session contract 恢复或失败；Extension restart 时可重新查询 run；页面导航时旧页面结果必须丢弃。三种生命周期各自独立，明确这一点比增加 keepalive 更可靠。

## 一套 MV3 故障验证矩阵

覆盖 worker 在接收前、执行中、reply 前被回收，content script 导航/iframe detach，Port disconnect，Browser restart，Extension update，Runtime disconnect/restart，以及同一事件重复投递。检查任务是否幂等、状态能否恢复、错误是否可诊断、旧结果是否串入新 document。

DevTools 中一次 worker 保持打开会改变回收时机，不能把调试状态下的稳定性当成真实结论。验收必须关闭 DevTools，在正常生命周期和旧客户端升级中运行。

## 工程结论

MV3 的约束不是需要绕过的退化，而是在提醒产品明确状态和生命周期。Extension 负责 Browser 内的交互、身份与受限能力入口；Runtime 负责长生命周期执行；Browser 负责最终权限裁决。三者分清后，worker 重启就从事故变成可预期事件。

## 继续阅读

- [18-Accessibility、国际化与平台语义：浏览器如何把“可用”交给真实的人](/blog/b33b3b84e02f9811): 相邻章节的前置机制。
- [20-网络传输、安全连接与代理：一次 URL 请求如何真正到达对端](/blog/7e16bb8b65e56b22): 相邻章节的后续机制。

## 上游源码入口

文中的相对源码路径可从 [Chromium 官方上游快照](https://chromium.googlesource.com/chromium/src/+/b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b/) 定位。此入口保留原稿的上游阅读坐标，不包含任何产品定制代码，也不替代运行时验收。
