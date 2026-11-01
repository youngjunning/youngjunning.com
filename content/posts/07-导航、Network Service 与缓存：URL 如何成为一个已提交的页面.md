---
id: "3258863e9aeaacd8"
title: "07-导航、Network Service 与缓存：URL 如何成为一个已提交的页面"
description: "从源码阅读入口、进程边界与验证条件理解导航、Network Service 与缓存：URL 如何成为一个已提交的页面。"
date: null
topic: "principles"
tags: []
collection: "docs"
cover: "/media/3258863e9aeaacd8-4ba76215643acc89.webp"
---

从源码阅读入口、进程边界与验证条件理解导航、Network Service 与缓存：URL 如何成为一个已提交的页面。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

![Chromium 导航、Network Service 与缓存封面](/media/3258863e9aeaacd8-4ba76215643acc89.webp)

> 阅读坐标沿用原稿：Chromium `153.0.8010.37`，上游 commit `b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b`。本次同步未重新进行源码与目标平台运行时验收。

![一次导航如何跨过 Browser、Network Service 与 Renderer](/media/3258863e9aeaacd8-fabb7aef5f59f9d6.webp)

## 一句话结论

一次 URL 导航至少包含提出请求、Browser 裁决、网络加载、response 处理、Renderer commit 与页面激活等不同状态；网络完成不等于页面切换，缓存命中也不等于绕过权限、隔离和生命周期。

地址栏里的一段 URL 不会直接交给当前 Renderer 的 `fetch` 实现。它首先是一项由 Browser 持有的导航意图：要在哪个 `WebContents`、哪个 frame、用哪个 Profile/Storage Partition、以何种用户手势和安全策略加载什么资源。只有这项意图被创建并通过策略检查，网络请求、进程选择、response 校验与 document commit 才会被串起来。

理解这一章最重要的分界是：**网络拿到 bytes，不等于导航成功；导航提交了 document，也不等于页面已经画到屏幕。** 前者还缺少 response、安全策略、frame 生命周期和 commit；后者还要经过第 05、07 章的 Renderer 与合成路径。

## 一次导航的最小主线

以下是地址栏输入 URL、在主 frame 加载新页面的阅读骨架。它不是每种导航的精确调用栈；history traversal、redirect、download、error page、prerender、BFCache 恢复和子 frame 都会改变其中一些步骤。

这条链路刻意把“发请求”“接收 response”“提交 document”写成三个阶段。它们之间可以有 redirect、取消、策略拒绝、Renderer 退出、frame 被移除，或另一次更晚的导航把旧请求取代。任何只用“LoadURL 后页面就打开了”描述的代码，都遗漏了真实的状态机。

## 已核验的源码锚点

这一节给出以本轮基线为准的第一组落点，不展开完整调用栈。先从这些点进入，再沿类型、调用者和 trace 向两端扩展，比从 `chrome/` 或 `net/` 盲搜更稳。

| 阶段 | 基线源码入口 | 该处证明什么 | 仍不能单独证明什么 |
| --- | --- | --- | --- |
| Navigation 状态机 | `content/browser/renderer_host/navigation_request.cc`：`BeginNavigation()`、`WillStartRequest()`、`OnResponseStarted()`、`ReadyToCommitNavigation()`、`DidCommitNavigation()` | 一次 Browser-side navigation 有显式阶段转换和 trace event | 某次具体导航一定走过每个同名阶段 |
| 导航请求装载 | `content/browser/loader/navigation_url_loader_impl.cc`：`Start()`、`StartNonInterceptedRequest()`、`OnReceiveRedirect()`、`OnReceiveResponse()`、`OnComplete()` | navigation 的 network 回调被单独封装，不是 Renderer 直接读 socket | 所有请求都跳过 interceptor 或由同一 factory 创建 |
| 网络能力接口 | `services/network/public/mojom/url_loader_factory.mojom`、`url_loader.mojom` | factory 创建一次性 `URLLoader`；response、redirect、complete 经 client 回调返回，销毁 loader 会取消请求 | factory 必然跨进程，或请求一定来自页面导航 |
| 网络上下文 | `content/browser/loader/url_loader_factory_utils.h`、`navigation_url_loader_impl.cc` 中对 `StoragePartition` 的取用 | Browser 侧导航可由 Storage Partition 提供 NetworkContext / URLLoaderFactory | 所有网络状态都由单个 Partition 文件或对象持久化 |
| 服务实现与 cache | `services/network/network_context.cc` 的 `CreateURLLoaderFactory()` 与 HTTP cache 配置/清理路径；`net/http/` 的 `HttpCache` | NetworkContext 管理 factory 与 HTTP cache 相关配置/清理，cache 有独立网络层实现 | 当前请求命中 cache，或某个 cache 设置对所有 Profile 生效 |
| 向 Renderer 提交 | `content/browser/renderer_host/render_frame_host_impl.h` 的 `CommitNavigation()` / `DidCommitNavigation()`，以及 `navigation_controller_impl.cc` 的 commit params 构造 | Browser 与 Renderer 的 document commit 是明确的 IPC/lifecycle 边界 | commit 后内容已经 raster 或显示到屏幕 |

例如，`URLLoader` 的 mojom 注释明确了它一次只加载一个 URL，client 端销毁 loader 会取消关联请求；`URLLoaderClient` 则分别接收 redirect、response 与 complete。这个接口事实支持本文“网络请求有可取消生命周期”的结论，但不支持“任何取消都是用户主动取消”——导航取代、frame 销毁、service 断连都可能成为实际原因，仍需 trace 区分。

## Browser-side navigation：谁拥有一次加载

桌面 Chromium 的高层入口通常可以从 `WebContents`、`NavigationController`、`Navigator` 和 `NavigationRequest` 这一组概念向下追。产品 UI 可以提出 URL 或 command，页面也可能经 link、form、`window.location` 或 history API 触发请求；但 Browser 侧才拥有 Tab、frame tree、Profile、权限和安全策略的完整上下文。

| 对象/层次 | 应理解的职责 | 不能据此断言 |
| --- | --- | --- |
| `WebContents` | 一个可呈现浏览内容的高层宿主，连接 UI、frame tree 与导航状态 | 一个 `WebContents` 只对应一个 Renderer 或一个 document |
| `NavigationController` / navigation entry | 管理前进后退、session history、可恢复的导航条目 | 新建 entry 就已经发生网络请求或 commit |
| `Navigator` / `NavigationRequest` | 协调一次正在进行的导航，保存 URL、阶段、结果与取消条件 | 所有导航都走同一具体类/函数或永不重入 |
| `RenderFrameHost` 与其 manager | 代表 Browser 对 frame/Renderer document 的控制与切换 | 当前 host 必然就是下一次跨站导航的承载者 |

这里的 ownership 是理解问题的关键。用户又输入一个 URL 时，旧的 `NavigationRequest` 可能被取消；server redirect 后，URL、origin 和 policy 重新进入判断；目标 site 变化时，Browser 也可能需要选择不同的 RenderFrameHost/Renderer。把导航状态只保存在 UI 或 Renderer，会失去这些跨进程、安全和历史记录所需的最终裁决点。

## URLLoader 与 Network Service：请求不是 Renderer 的裸 socket

Network Service 把 HTTP、缓存、cookie、代理、证书、DNS、连接复用等网络工作放在明确的服务边界之后。调用者通常面向 `network::mojom::URLLoaderFactory`、`URLLoader` 与 client 回调一类接口；实现如何宿主于独立进程、是否因平台或测试配置退回同进程，必须由当前启动与 binding 代码证实。

从架构角度，`URLLoaderFactory` 的价值不只是“创建 loader”：它把调用者获准使用的网络上下文收束为一个 capability。调用方不能因为拿到 URL 字符串，就绕过所属 Profile 的 cookie jar、代理策略、证书处理、缓存分区或请求限制去建立任意连接。

阅读一条请求时，推荐记录下表，而不是只记住 `URLLoader` 这个名字：

| 要问的问题 | 应寻找的源码/运行时证据 |
| --- | --- |
| 网络上下文属于谁？ | `StoragePartition`、NetworkContext 的创建与 Profile 关联 |
| 谁得到 factory，谁创建 loader？ | factory 获取点、Mojo binding、`URLLoaderClient` owner |
| 请求携带哪些隔离信息？ | `network::ResourceRequest` 的 URL、initiator、site/origin、credentials、priority 等字段及构造处 |
| redirect/response 谁先处理？ | URLLoader client 回调、Browser-side navigation 的阶段转换与 policy hook |
| service 断连或 loader 失败谁收口？ | disconnect handler、错误回调、`NavigationRequest` 取消/失败分支 |

不要把 Chromium 页面导航和页面内 `fetch()` 写成同一条代码路径。二者都可能消费 Network Service 的能力，但发起者、生命周期、response 的消费者和最终策略不同：导航的结果是替换或更新一个 document；`fetch` 的结果则是当前 document 内的 Web API promise/stream，后者受 Renderer 中 Blink/V8 生命周期约束。

## 缓存和 cookie：它们属于网络上下文，不是一个全局加速开关

浏览器缓存常被简化成“命中就不用联网”。这对产品说明够用，对源码阅读不够。cache 的可见性和复用资格受请求 method、响应 headers、freshness、revalidation、Vary、credentials、partition/网络上下文以及用户清理等条件共同影响；cookie 也以所属网络上下文、站点关系、SameSite、Secure 等规则参与请求和响应处理。

因此应把它们放进同一张边界图里：

```text
Profile
  -> StoragePartition
     -> 网络上下文（cookie、HTTP cache、proxy/证书等相关状态）
        -> URLLoaderFactory capability
           -> 某次 navigation 或 subresource/fetch 请求
```

这张图并不意味着所有状态都以一个单一文件或一个实现对象存在；它表达的是 ownership：不同 Profile、OTR/incognito 或不同 Storage Partition 的请求，不应仅因 URL 相同就默认共享身份状态和缓存结果。排查“登录态串了”“无痕还读到了数据”“清 cache 没生效”时，先确认请求实际归属的 partition/context，再去追具体的 HTTP cache 或 cookie 代码。

缓存命中也不能证明 response 安全可提交。即使 bytes 来自 cache，导航仍要在 Browser 侧处理 response、origin、MIME、下载、安全策略和 frame 当前状态。反过来，一次 cache miss 也不天然是性能 bug：它可能是隔离、header 语义、用户清理或资源本身不可复用的正确结果。

## 从 response 到 commit：为什么不是“下载完成就换页”

navigation 收到 response、redirect 或 error 时，Browser-side state machine 需要持续判断这一次尝试是否仍有效。常见的判定维度包括：请求是否已被新导航取消、目标 frame 是否仍存在、response 是否允许作为文档处理、是否需要切换 site/Renderer、是否命中下载或错误页分支，以及是否通过安全/产品 policy。

只有 commit 被允许，目标 Renderer 才会获得新的 document 提交。此时旧 document 的异步工作并不可以继续向新页面写结果；第 04、05 章讨论的 Frame/Document owner、Mojo 端点与 callback 取消语义会再次生效。

```text
response 到达
  -> 这还是当前 NavigationRequest 吗？
  -> frame 与 WebContents 还存在吗？
  -> redirect / response / policy 是否允许继续？
  -> 是否需要不同的 RenderFrameHost 或 renderer process？
  -> commit 新 document，或明确失败/取消/下载
```

这个顺序解释了两类常见误判：

- “Network 面板有 response，所以页面应该已经替换”：response 只证明网络层产生了结果；commit 还可能被取消、拒绝或转入别的分支。
- “Renderer crash 一定是网络错误”：网络请求可能已经成功，而目标 Renderer 在 commit 前后退出；应分别观察 URLLoader 的结果、Browser navigation 状态和 child process 生命周期。

## Redirect、错误页、BFCache 与下载不是边角案例

它们都在提醒读者：navigation 不是单向函数调用。

| 情形 | 对阅读模型的影响 |
| --- | --- |
| Server/client redirect | 同一次尝试可经历多个 URL 与多轮 policy/security 判断；不要只用初始 URL 解释最终 origin。 |
| 网络错误或证书错误 | 请求结束不等于 document commit；Browser 可能生成或展示错误路径，具体产品处理需要单独核对。 |
| Download | response 可能被判为下载而不是可提交的 document，因此没有“新页面加载完成”的后续 Renderer 文档。 |
| BFCache / history traversal | 可能恢复既有 document，而非重新按网络路径创建新 document；缓存资格与恢复条件都要在目标版本验证。 |
| Prerender / activation | 预先加载与可见页面激活是不同阶段；不能把 network activity 直接等同于用户已看到并使用的页面。 |

这些分支不要求第一次源码阅读全部追完，但设计接口和修 bug 时必须问：这项改动到底绑定“网络完成”“导航 commit”还是“页面激活”？三者的用户可见含义不同，错误地选一个会造成过早上报、旧页回调或指标重复。

## 排障：把导航问题拆成四段取证

| 现象 | 首先确认 | 再追哪一段 |
| --- | --- | --- |
| 输入 URL 后没有任何请求 | UI command、`NavigationController`/`NavigationRequest` 是否真的创建 | 产品 policy、URL 规范化、Tab/Frame 生命周期 |
| 有请求但最终没有页面 | URLLoader 结果、redirect/response 分支 | response policy、下载/错误页、安全检查、取消原因 |
| response 成功但白屏/旧页 | 是否发生新 document commit，目标 Renderer 是否存活 | Blink 解析、Renderer 错误、paint/compositor（第 05、07 章） |
| 登录态/缓存异常 | 当前 Profile、StoragePartition、NetworkContext | cookie/cache policy、OTR、清理操作与实际 factory/context |

每一段都要保留一个可观察证据：DevTools Network 的请求细节、`chrome://net-export`/NetLog、trace、Browser log、导航回调或调试器断点。单独看 UI、只看 Renderer console 或只看 server access log 都只能覆盖其中一段。

## 运行时与产品验证路径

- 从地址栏 action 到 `NavigationController`/`NavigationRequest` 登记一条主 frame 导航的准确 Chrome UI 文件、target 与调用边界；本文已核验的起点从 `NavigationRequest::BeginNavigation()` 开始。
- 已确认 `NavigationURLLoaderImpl` 会取用 `StoragePartition` 的网络上下文/factory；仍需以实际启动参数与 trace 验证 Network Service 的进程宿主和对应 Mojo binding。
- 为正常 200、至少一次 redirect、网络失败、download 与新导航取消分别采集 NetLog/trace，写清“请求结束、commit、页面激活”的差异。
- 在 normal 与 OTR Profile 下复现同一 URL 的 cookie/cache 行为，验证真实 partition，而不以界面猜测隔离是否生效。

## 从故障反推边界：页面没有切换，不等于网络没完成

一个请求可以已经收到 200 response，却因为新导航取代、Renderer 未准备好、commit 检查失败、下载分流或 error page 处理而没有成为当前页面。反过来，用户看到旧页面也不代表 Browser 没有启动新导航；旧 document 在 commit 前仍可能保持可见。排障日志若只有“URLLoader complete”，就无法解释用户所见。

## 同文档导航与跨文档导航不是一条缩短的路径

URL 变化不总是创建新 document。fragment、`history.pushState()` 和部分 Navigation API 行为属于 same-document navigation；普通链接、地址栏输入、redirect 和 reload 多数进入 cross-document navigation。二者都会影响 history 与可见 URL，却不共享完整的 Network/Renderer commit 生命周期。

排查“URL 变了但页面没刷新”时，先判断导航类型，而不是直接追 URLLoader。同文档导航主要更新当前 document 的 history/state，并触发相应事件；跨文档导航才需要 Browser 侧决定是否发请求、如何选择 SiteInstance/RenderProcessHost、何时让新 document 取代旧 document。

这也影响埋点和 Agent identity。只监听地址变化会把 pushState 与新 document 混在一起；只记录 Tab ID 又无法判断 reply 属于导航前还是导航后。应把 navigation id、frame/document identity 和 commit 类型一起记录。

## 新旧 document 在 commit 前如何共存

跨站导航可能需要创建新的 Renderer 或 speculative RenderFrameHost。在网络与策略检查完成前，旧 document 仍可能可见，新 document 则处于准备状态。commit 是所有权切换的关键节点：Browser 接受 response，并把新 document 设为 frame 当前内容；失败、取消或被更晚导航替代时，speculative 状态必须清理。

这段时间里最容易出现三类竞态：

1. 旧页面在 unload/visibility 生命周期中继续发请求或更新 UI；
2. 新导航尚未 commit，产品 UI 已提前把地址、权限或 Agent 上下文当成新页面；
3. 前一个 navigation 的异步 policy/Runtime reply 晚到，覆盖后一个 navigation 的决策。

因此 Browser-side owner 不应只保存“当前 URL”，而要用具体 NavigationRequest 与 document token 约束回调。凡是跨过 network、permission、safe browsing、Extension 或 Runtime 的异步结果，都要在应用前确认请求仍是当前状态机的一部分。

## Response 并不总是进入 Renderer

同一个 URLLoader 返回的 response，后续可能成为正常文档、下载、错误页、PDF/内置查看器、外部协议处理或被策略阻止。决定点分布在 MIME、Content-Disposition、HTTP 状态、Browser policy、embedder hook 和导航状态中。

这解释了为什么“服务器返回 200，页面却没有 commit”不一定是异常。若 response 被认定为下载，Browser 会把它交给 Download subsystem；若证书、权限或安全策略拒绝，可能转入错误页；若 redirect 到外部 scheme，最终结果甚至不是 WebContents 中的新 document。

测试导航功能时，至少加入 redirect chain、download response、network error、renderer crash during commit 和用户快速发起第二次导航。只覆盖一个 200 HTML 页面，无法证明状态机收口正确。

## Cache 是一组带身份的复用决策

HTTP cache、memory cache、code cache、BFCache、Service Worker、preload/prefetch 解决的是不同问题。HTTP cache 复用网络 response，Blink memory cache 更靠近 Renderer 资源，BFCache 保存整个 document 状态，Service Worker 可以在请求链中提供自定义 response。它们不能用一个“清缓存”统一解释。

缓存 key 还可能包含 Network Isolation Key、credentials、Vary、partition 与请求模式。两个表面相同的 URL 未必共享缓存；同一 URL 命中缓存也不代表绕开 cookie、CORS、Service Worker 或安全检查。排障时应先确定请求由哪一层满足，再决定看 NetLog、DevTools cache status、Service Worker 事件还是 BFCache eligibility。

## 一条更完整的导航证据链

可以把导航验收写成六个时间点：

| 时间点 | 建议记录 | 可识别的失败 |
| --- | --- | --- |
| action accepted | UI source、WebContents、navigation id | 入口没触发、目标 Tab 错误 |
| request started | URL、method、NetworkContext、isolation identity | policy 阻止、请求未发出 |
| redirect/response | chain、status、MIME、cache/service worker | 重定向循环、response 类型变化 |
| ready to commit | target process、SiteInstance、frame/document | process selection、旧请求晚到 |
| did commit | committed URL、document token、transition | commit 取消、错误页、同文档误判 |
| first visible frame | frame id、present timing、业务 ready | Renderer/Compositor 白屏、资源未就绪 |

这六个点不要求永久加入详细日志；开发阶段可以用 trace、observer、DevTools 和 NetLog组合得到。关键是让“导航完成”有明确含义，而不是用任意一个 callback 代替全部阶段。

## Service Worker 让“网络路径”出现可编程分支

受控页面的请求可能先进入 Service Worker fetch event，由它返回缓存、自行发起请求或回落网络。Navigation Preload 又允许 Browser 在 worker 启动期间并行准备网络 response，减少启动等待。这意味着 DevTools 看到的 response source、worker 生命周期和 Network Service request 必须一起解释。

Worker 更新、skip waiting、controller 变化和离线状态都可能让同一 URL 在不同时间走不同路径。排障时记录当前 registration/version、页面 controller、response source 与 preload 状态；不要用“清缓存后好了”同时覆盖 HTTP cache 和 Service Worker storage。对登录、支付和 Agent 页面，还要验证 worker response 不会跨 storage partition 或旧 document 错配。

当 navigation response 最终转为下载时，Service Worker、Content-Disposition 与 Browser download decision 的证据也要对齐，避免把“页面未提交”误报成 worker 失败。

## 工程结论

导航是 Browser 拥有的状态机，不是 Renderer 发起的一次 fetch。把网络、commit 和可见性拆成不同证据后，缓存、权限、Extension hook 与产品策略才有明确且可测试的插入点。

## 继续阅读

- [08-Compositor、Viz、Skia 与 GPU：一帧如何真正到达屏幕](/blog/636da0fdc5bcbe17): 相邻章节的后续机制。

## 上游源码入口

文中的相对源码路径可从 [Chromium 官方上游快照](https://chromium.googlesource.com/chromium/src/+/b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b/) 定位。此入口保留原稿的上游阅读坐标，不包含任何产品定制代码，也不替代运行时验收。
