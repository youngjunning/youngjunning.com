---
id: "dbe78a7f89fd4529"
title: "五、多进程、Mojo 与 Service：浏览器如何隔离又如何协作"
description: "从源码阅读入口、进程边界与验证条件理解多进程、Mojo 与 Service：浏览器如何隔离又如何协作。"
date: null
topic: "principles"
tags: []
collection: "docs"
cover: "/media/dbe78a7f89fd4529-325efca8291c8312.webp"
---

从源码阅读入口、进程边界与验证条件理解多进程、Mojo 与 Service：浏览器如何隔离又如何协作。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

![Chromium 多进程、Mojo 与 Service 封面](/media/dbe78a7f89fd4529-325efca8291c8312.webp)

> 阅读坐标沿用原稿：Chromium `153.0.8010.37`，上游 commit `b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b`。本次同步未重新进行源码与目标平台运行时验收。

![Chromium 多进程角色、所有权与 Mojo 协作边界](/media/dbe78a7f89fd4529-690825681df450c2.webp)

## 一句话结论

Chromium 用进程划分故障域和权限域，用 Mojo 表达可调用的能力边界；分析一条跨进程链路时，真正需要锁定的是资源 owner、调用者身份、接口绑定、sequence 与断连后的收口，而不是只搜索同名函数。

Chromium 的多进程不是把代码“分几个进程跑”这么简单。它把不可信网页代码、产品决策、图形驱动、媒体编解码和高权限系统能力放入不同故障域与权限域，再用受约束的接口让它们协作。这样做带来了隔离，也带来了阅读成本：一次看似普通的函数调用，可能在另一进程、另一条 sequence、另一个生命周期里才完成。

要读懂这套模型，先放下“谁调用谁”的单进程直觉，改成四个问题：**谁拥有资源？谁可以请求它？接口在哪里绑定？对端消失时谁负责收口？**

## 四类常见进程角色

| 进程 | 主要职责 | 信任与故障边界 | 不能简单认为 |
| --- | --- | --- | --- |
| Browser | 产品决策、Tab/窗口、导航协调、Profile、权限与高层服务 | 通常拥有最完整的用户与产品上下文 | 所有重计算和所有 Web 内容都在这里执行 |
| Renderer | Blink、V8、DOM、页面脚本与渲染侧 document 生命周期 | 网页内容彼此及其对浏览器能力的访问受严格约束 | Renderer 可以直接访问任意本地资源或全局用户状态 |
| GPU | 图形命令、合成相关能力、驱动交互 | 隔离不稳定或高风险的图形驱动路径 | 每个 frame 都一定由独立 GPU 进程完成 |
| Utility / Service | 网络、音视频、数据解码、特定服务等可拆分工作 | 为特定能力建立更小的权限与崩溃域 | “Utility”是一种固定业务功能，而不是运行隔离策略 |

这些角色不是永远一一对应。某些 service 可以因平台、feature、测试模式或性能策略而在不同进程中运行；同一产品功能也会跨多个角色。因此，目录名与 process name 只能作为入口线索，不能作为运行时结论。

## 为什么 Browser 不能直接替 Renderer 做决定

Renderer 最接近网页，却不应拥有 Browser 的全部能力。以一次网页请求权限、访问文件、发起导航或调用扩展能力为例，Renderer 可以提出请求并提供 origin、frame、用户手势等上下文，但真正的策略判断通常需要 Browser 一侧持有的 Profile、权限状态、Tab 生命周期与产品规则。

这是安全边界，不是代码组织偏好：如果网页进程可以把任何请求当作本地函数调用，它就有机会绕过用户状态、跨站隔离或产品 policy。于是 Chromium 将“提出请求”和“拥有最终权力”拆开，并让消息携带足够的身份、frame 与生命周期信息供接收方复核。

## Mojo：接口、端点与消息管道

Mojo 提供了 Chromium 中大量跨组件通信的接口描述与传输机制。阅读时可以把它暂时拆成四个角色：

| 概念 | 作用 | 阅读时应记录的事实 |
| --- | --- | --- |
| `.mojom` interface | 声明可调用的方法和传输的数据类型 | 谁定义了能力边界，哪些数据跨越边界？ |
| `Remote` | 持有调用对端的客户端侧端点 | 谁创建它，在哪条 sequence 使用，断连回调是什么？ |
| `Receiver` | 接收并把请求交给本地实现 | 实现对象在哪创建，谁拥有其生命周期？ |
| pipe / pending endpoint | 在尚未绑定时传递端点所有权 | 端点最终交给谁，绑定发生在同进程还是跨进程？ |

`Remote`/`Receiver` 的外观很像普通 C++ 调用，但它们不保证同步、同线程或同进程。调用方发布消息后，接收方何时处理取决于消息管道和 task 调度；接收方崩溃、导航、Frame 销毁或 service 停止时，未完成回调和端点断连都可能成为真实业务状态。

所以看到一个 interface 时，不能停在 `.mojom` 文件。至少还要找四处：创建 `PendingRemote` 的地方、绑定 `Receiver` 的地方、实现类的 owner、断连或 reset 的处理。缺其中任何一处，都无法判断接口的实际进程边界和失败行为。

## “服务”是一份运行契约

Chromium 中常见的 service 概念描述的是：一个能力以接口方式被消费，可以运行在独立进程或受控环境中，并由启动/绑定逻辑决定其宿主。`services/` 目录有很多实现，但“某项服务”的运行位置还取决于 service manager、manifest、feature、平台和调用路径。

一项服务的架构描述至少应回答：

1. 它暴露什么接口，调用者是谁？
2. 它由哪个进程或 factory 启动，具有什么权限？
3. 数据从哪里来、经过哪些序列化与验证？
4. 崩溃、断连、重启、导航取消时，谁向用户或上层报告失败？
5. 测试里是否使用 in-process fake；若使用，真实进程边界还有没有被覆盖？

如果一个说明只写“该功能使用 Mojo 调用某服务”，它还没有解释能力边界。只有补齐宿主、权限、生命周期和失败处理，读者才知道这里是为了复用、为了隔离，还是两者兼有。

## 以一次跨进程请求为例

下面的链路是通用阅读模板，不对应某个特定 API 的准确函数名：

```text
Renderer 中的 Web API / Blink 实现
  -> Renderer-side client 或 Mojo Remote 发起请求
  -> IPC 携带 frame、origin、参数与端点
  -> Browser-side Receiver / service 实现接收
  -> Browser 使用 Profile、权限、导航状态做校验与决策
  -> 调用受限系统能力或另一 service
  -> 结果或错误经 callback 回到 Renderer
  -> Renderer 检查 document/frame 是否仍有效，再交给 Web API
```

这条模板包含两个经常遗漏的条件：请求抵达时原页面可能已导航，响应返回时 frame 也可能已经销毁。因此 callback 到达时必须重新判断生命周期；很多 UAF、悬挂回调和向旧 document 回传结果的问题都隐藏在这里。

## 调试多进程问题的最小证据链

多进程问题不适合只靠搜索。推荐把静态与运行时证据配成一组：

| 目的 | 静态证据 | 运行时证据 |
| --- | --- | --- |
| 确认接口边界 | `.mojom`、实现类、binding 点 | IPC/Mojo trace 或断点命中两端 |
| 确认进程宿主 | 启动/manifest/factory、命令行条件 | 进程列表、child process 命令行、trace process track |
| 确认权限决策 | Browser-side policy/permission 调用链 | 正常、拒绝、导航取消三类实际请求 |
| 确认断连语义 | disconnect handler、reset、析构路径 | kill/restart/导航后回调与错误行为 |

“请求成功一次”不足以证明跨进程链路可靠。至少还要验证拒绝、对端退出和发起方生命周期结束；它们决定错误是否被正确限制在当前 Tab/Frame，而不是泄漏为全局状态或崩溃。

## 源码验证路径

- 在基线 checkout 选择一个真实 `.mojom` interface，登记声明、Remote 创建点、Receiver 绑定点、实现 owner 与断连处理。
- 对同一 interface 分别验证 Browser 与 Renderer 的 process/sequence，明确是否真的跨进程。
- 选择一个 permission 或导航取消场景，记录请求、拒绝、Frame 销毁后的 callback 行为。

## 工程推演：Mojo 调用成功，为什么结果仍然是错的

Mojo 只保证消息按接口和管道传输，不替业务判断结果是否仍适用于当前状态。一个 Renderer 发出摘要请求后，用户可能已经导航到新页面；一个 Utility service 返回解码结果时，原来的 WebContents 可能已关闭；一个 Runtime 重连后，也可能重复处理旧 request。此时 pipe 没断、callback 正常触发，结果仍然可能越权或污染新状态。

因此跨进程 contract 至少应携带或能恢复以下语义：caller identity、Profile/partition、frame/document 或目标资源 identity、request id、deadline、cancel 原因、幂等规则和 reply 的适用条件。Browser 侧必须基于自己持有的状态复核，而不能相信 Renderer/Extension 自报的 URL、Tab ID 或授权结果。

| 失败模式 | 架构信号 | 应有的收口 |
| --- | --- | --- |
| 对端崩溃或主动断开 | disconnect handler | 取消任务、释放资源、向 caller 返回可区分错误 |
| 导航导致旧 document 失效 | frame/document identity 改变 | 丢弃晚到 reply，不写入新页面 |
| service 重启 | 新 receiver/instance | 重建必要状态，不默认重放高风险操作 |
| Browser shutdown | task environment 进入 teardown | 停止接收新请求，避免依赖已销毁 owner |

## Mojo 接口真正包含四份契约

一份 Mojom 定义看上去像跨进程函数声明，但工程上至少包含四份契约：

1. **类型契约**：哪些字段可序列化，哪些 handle/remote 可以转移，版本演进怎样兼容；
2. **身份契约**：receiver 创建时绑定了哪个 Profile、frame、origin、Extension 或 service instance；
3. **时序契约**：消息在哪个 sequence 消费，是否有顺序要求，reply 能否晚于导航或 shutdown；
4. **失效契约**：断连、进程退出、bad message、timeout 和 owner 销毁后怎样取消与恢复。

只设计 method 和参数，后面三份契约就会以隐式状态散落在调用方。尤其是把 Tab ID、URL 或全局 singleton 当身份，会让接口在导航、Profile 切换和多窗口场景中产生越权或串结果。

## Remote、Receiver 与 Associated Interface 的选择

`mojo::Remote` 表达向远端接口发送消息，`mojo::Receiver` 将实现绑定到消息管道；ReceiverSet/RemoteSet 等容器进一步管理多连接。选择哪种封装，不只是语法偏好，而是 owner 和连接模型：一个 caller 一条连接、一个 service 多 caller，还是连接本身携带 caller context。

Associated interface 可以与既有 endpoint 共享顺序关系，但这项顺序保证有明确范围。它不能替代业务层 request identity，也不能让不同 sequence、不同 document 的所有事件自动全序。若正确性依赖“消息 A 必须先于 B”，应写清它们是否经过同一 associated group、对端是否在同一 sequence 处理，以及断连重绑后顺序是否重新开始。

## Service 可以换进程，但安全判断不能随宿主漂移

Chromium service 可能 in-process、out-of-process 或在测试中使用替代实现。抽象的价值是让宿主可变，但 caller 权限与数据隔离不能依赖“它今天跑在哪个进程”。如果 out-of-process 时做 origin 校验，in-process test implementation 却直接信任参数，测试会掩盖真实安全 contract。

更稳妥的做法是把 caller context 在绑定时冻结，service method 只接受完成当前动作所需的最小对象；高风险输入由 Browser owner 复核。这样即便 service 宿主、sandbox profile 或启动方式改变，权限语义仍然稳定。

## Backpressure 与大消息：接口成功也可能拖垮系统

Mojo 让跨进程通信更像普通调用，但数据仍需要序列化、排队和复制或共享内存映射。高频小消息、大型 payload、无上限队列和同步等待都可能把一个逻辑正确的接口变成性能问题。

设计数据通道时应考虑：是否可以 batch，是否只传 metadata/handle，消费者慢时生产者怎样降速，旧 request 是否可丢弃，队列是否有上限，大对象是否应使用 data pipe/shared buffer。对页面截图、媒体帧、trace 或 Agent 上下文，尤其不能把“能放进 struct”当成合理传输方案。

## 断连是正常状态转换

Renderer 会因导航、崩溃或策略被替换；Utility service 可能按需重启；Extension worker 本就可能回收。disconnect handler 应把连接从 `Bound/Ready` 转为明确的 `Disconnected/Failed`，同时取消或标记所有 in-flight request。若允许恢复，还要区分新的 service instance，避免旧 reply 在重连后被当作当前结果。

可以用三类故障注入验证 contract：在 request 发送前关闭 owner，在对端处理期间终止 child process，在 reply 返回前导航到新 document。通过条件包括不越权、旧结果不落入新状态，以及调用方得到明确失败或可控重试；只验证“不崩溃”还不够。

## 工程结论

进程隔离的收益只有在接口也限制能力时才成立。把高权限对象隔离到 Utility process，却暴露一个无需身份校验的宽接口，并不会得到安全设计；反过来，即使实现暂时同进程，只要 contract、owner 和失效语义清晰，未来拆分也更可控。

## 上游源码入口

文中的相对源码路径可从 [Chromium 官方上游快照](https://chromium.googlesource.com/chromium/src/+/b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b/) 定位。此入口保留原稿的上游阅读坐标，不包含任何产品定制代码，也不替代运行时验收。
