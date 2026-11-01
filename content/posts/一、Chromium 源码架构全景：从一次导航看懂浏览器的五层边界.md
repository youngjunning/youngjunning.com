---
id: "067eb03e2aea7f53"
title: "一、Chromium 源码架构全景：从一次导航看懂浏览器的五层边界"
description: "从源码阅读入口、进程边界与验证条件理解Chromium 源码架构全景：从一次导航看懂浏览器的五层边界。"
date: null
topic: "principles"
tags: []
collection: "docs"
cover: "/media/067eb03e2aea7f53-550fee9d25bcbc09.webp"
---

从源码阅读入口、进程边界与验证条件理解Chromium 源码架构全景：从一次导航看懂浏览器的五层边界。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

![Chromium 源码架构全景封面](/media/067eb03e2aea7f53-550fee9d25bcbc09.webp)

> 阅读坐标沿用原稿：Chromium `153.0.8010.37`，上游 commit `b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b`。本次同步未重新进行源码与目标平台运行时验收。

Chromium 的复杂度集中在跨层协作：同一个用户动作会同时经过产品 UI、Browser 进程、Renderer、Network Service、GPU 和操作系统。只看目录，很容易得到一组似是而非的印象：`chrome/` 是浏览器，`content/` 是通用库，`third_party/` 是第三方依赖，`services/` 是后台服务。可一旦追踪导航、paint、权限请求或 Extension 调用，这些目录就会在同一条路径上反复出现。

真正有用的全景图必须同时回答五个问题：源码怎样进入当前 binary，进程由谁创建，状态由谁拥有，能力凭什么跨越边界，最终结果在哪里可观察。目录只能提供入口，不能替代这些答案。

![一次用户动作如何穿过 Chromium 与产品边界](/media/067eb03e2aea7f53-a611c032557e78e6.webp)

## 一句话结论

Chromium 是一套由 **构建图、产品模型、多进程、权限身份、异步生命周期和平台适配** 共同约束的运行系统，不适合从根目录开始顺序阅读。更短的阅读路径是选定一次真实用户动作，沿途记录 binary 输入、owner、进程、接口、状态变化、失败收口和运行证据。

## 一篇“全景”文章需要覆盖什么

源码全景不是把目录解释一遍，也不是把几百个 class name 排成调用链。它至少要把四张彼此关联的图放在一起：

| 视图 | 核心问题 | 忽略后的典型误判 |
| --- | --- | --- |
| 构建视图 | 哪些 revision、DEPS、GN args、generated code 和 target 形成当前 binary？ | “文件在 checkout 里，所以程序一定执行了它。” |
| 运行视图 | Browser、Renderer、GPU、Utility/Service 分别在哪里创建、通信和退出？ | “同名函数连起来，就是一条连续调用栈。” |
| 状态视图 | Profile、WebContents、frame、document、origin、StoragePartition 和 request 分别拥有哪段状态？ | “Tab 还在，所以旧回调仍属于当前页面。” |

这四张图不能相互替代。源码能证明实现候选路径，GN 能证明静态依赖，断点和 trace 能证明一次实际运行，Distribution package 和旧客户端升级才能证明交付。任何一层通过，都不能自动推出下一层通过。

## 用五层坐标判断问题

可以先把桌面 Chromium 暂时看成五层：

| 层 | 常见目录 | 主要职责 | 阅读时最容易犯的错误 |
| --- | --- | --- | --- |
| 产品层 | `chrome/`、`extensions/` | 地址栏、Tab、窗口、Profile、Chrome UI、WebUI、Extension 与产品策略 | 把 Chrome 的产品选择当成所有 Chromium embedders 都必须具有的机制 |
| 浏览器平台层 | `content/`、`components/`、`services/` | WebContents、导航、多进程协调、可复用组件和跨进程服务契约 | 把“运行在 Browser 进程”误认为“只能由 `chrome/` 决定” |
| Web 执行层 | `third_party/blink/`、`v8/` | Web API、DOM、JavaScript、style、layout、paint 与 Renderer 内生命周期 | 只在 Renderer 中找问题，忽略导航、权限和进程分配通常由 Browser 裁决 |
| 图形与系统层 | `ui/`、`gpu/`、`skia/`、`media/`、`net/` | 窗口、输入、合成、栅格、网络、媒体与平台适配 | 把源码目录边界等同于进程边界、安全边界或最终设备结果 |
| 基础与工程层 | `base/`、`mojo/`、`build/`、`tools/`、`testing/` | Task/Sequence、内存、IPC、构建、生成代码、测试和诊断 | 把它们当作辅助代码，不理解它们规定了上层代码可以怎样表达 |

这不是 Chromium 的正式分层规范。`components/` 可以同时被平台和产品消费，`services/` 的实现可能按版本或配置进入不同进程，`net/` 也不等于 Network Service 的完整进程边界。这套坐标的用途，是让读者迷路时先按职责、owner 和运行位置回退，而不是继续向下点文件。

## 从源码到 binary：运行架构从构建输入开始

Chromium 的运行时不是从 `main()` 才开始决定。真正的第一层输入是 checkout 与构建图：

```text
Chromium revision
  + DEPS / CIPD / third-party revisions
  + GN args / platform / toolchain
  + BUILD.gn targets / generated code / resources
  -> Ninja 或 Siso 执行图
  -> chrome / tests / helper processes / resources
```

`DEPS` 决定当前源码树还需要哪些仓库、工具和二进制输入；GN 根据 target、平台条件、feature 与 toolchain 生成执行图；Ninja/Siso 执行 compile、link、action 和资源处理。Mojom、GRIT、protobuf、V8 snapshot 等生成步骤并不是构建后的附属物，它们会直接形成运行时接口、资源和数据布局。

因此，“搜到了一个实现文件”只说明源码存在。要证明它进入当前程序，至少还要检查：

1. 它属于哪个 GN target；
2. 该 target 是否被目标 binary 依赖；
3. 当前平台和 GN args 是否选择了这条分支；
4. generated output 是否与当前 checkout 一致；
5. 运行中的 executable 是否真来自这个 output directory。

## 从进程入口到首个窗口：启动不是一次函数调用

桌面 Chromium 启动大致经历平台入口、进程角色分发、Content 初始化、Browser 主循环、Profile 与服务建立、首个窗口创建等阶段。`chrome/` 提供产品级 Browser main parts，`content/` 提供 embedder 共用的启动和多进程框架；Renderer、GPU、Utility 等 child process 也会从统一入口根据 command line process type 进入不同 main path。

可以先用下面的骨架理解启动：

```text
OS 创建进程
  -> 解析 process type 与命令行
  -> Content 层分发 Browser / Renderer / GPU / Utility
  -> Browser 初始化主线程、Feature、Policy、Profile 与关键服务
  -> 恢复会话或创建首个 Browser / WebContents
  -> 启动后任务继续完成非阻塞初始化
```

窗口出现不是启动全部完成。某些服务、Extension、网络上下文、媒体设备和产品能力会延后初始化；相反，某些必须影响进程模型或 Feature 的配置必须在 child process 创建前冻结。排查首个动作失败时，应区分“窗口已显示”“Profile 已可用”“服务已 ready”“业务首次请求已成功”四个时间点。

退出同样属于架构。Browser 关闭、Profile 销毁、Renderer 退出、Service 断连和后台任务取消有各自顺序。一个只解释创建、不解释 shutdown 和断连的架构图，无法指导长期运行的桌面产品。

## 多进程构成 Browser 的安全与故障边界

Chromium 通过进程隔离把不可信 Web 内容、图形驱动交互和高权限产品决策拆开。进程数量并不固定为“一个 Tab 一个 Renderer”，实际分配还受 Site Isolation、site instance、frame tree、process reuse、内存压力、平台与配置影响。

| 进程角色 | 主要拥有的职责 | 不应由它直接决定的事情 |
| --- | --- | --- |
| Browser | 窗口与 Tab、Profile/BrowserContext、导航裁决、权限、进程生命周期、产品服务 | 不能把不可信页面脚本当成具有 Browser 权限的调用者 |
| Renderer | Blink/V8、DOM、Web API、style/layout/paint、页面与 frame 内执行 | 不能裸读任意本机文件、凭页面声明授予系统权限或直接拥有 Browser UI |
| GPU | GPU command、部分 raster、Viz/GPU service 与平台图形后端 | 不能替 Browser 决定页面身份或产品权限 |
| Utility/Service | Network、media、data decoder 等可隔离能力，具体宿主随版本与配置变化 | 不能仅凭“请求来自 Browser”就省略 caller、origin 或 request 校验 |

跨进程之后，调用栈不会自然延续。Mojo interface、Remote/Receiver、消息序列化、异步 reply 和 disconnect handler 共同构成新的边界。看见 Mojo 也不能直接断定“必然跨进程”，因为接口可以在同进程绑定；需要继续找到 receiver 的创建位置、目标 sequence 和真实进程宿主。

追踪一次跨进程调用时，至少记录五项：调用方进程、接收方进程、接口绑定点、request/document identity、断连和取消语义。只记录 interface method name，通常还不足以解释竞态和旧结果覆盖。

## Browser 侧对象：从 Profile 到当前 document

进程只是容器，真正决定状态归属的是 Browser 侧对象关系。可以用一条简化链理解常见 ownership：

```text
BrowserProcess
  -> BrowserContext / Chrome Profile
      -> StoragePartition / keyed services / policies
      -> Browser window
          -> WebContents
              -> frame tree
                  -> RenderFrameHost / document
                      -> SiteInstance / RenderProcessHost
```

这不是严格的 C++ 所有权图，却能防止几个常见误判：

- **Profile 不等于窗口。** 一个 Profile 可以拥有多个窗口和 WebContents，并承载偏好、策略、存储分区与 keyed service。
- **WebContents 不等于当前页面字符串。** 它承载导航、frame tree、可见性和页面生命周期；一次导航前后可能出现新旧 document 交接。
- **frame 不等于 process。** 多个 frame 可能共享进程，也可能因为 site isolation 跨进程；同一个 frame 的 document 会随导航替换。
- **Tab ID 不足以标识一次请求。** 异步结果还要绑定 frame/document/request identity，否则导航后旧 reply 可能写进新页面。
- **StoragePartition 不只是缓存目录。** 它组织网络和站点数据的隔离上下文，具体数据类型仍有各自访问规则。

对于 Extension、媒体、文件、本机能力和 Agent reply，Browser 侧应当以“当前 caller 是否仍代表原请求”为判断核心，而不是仅验证对象地址尚未释放。

## 用一次导航串起主要子系统

“地址栏输入 URL 并回车”是一条适合建立全景的主线，因为它会经过产品、Browser、Network Service、Renderer、Compositor、Viz 和平台显示系统：

```text
地址栏 / Tab UI
  -> Browser 侧创建并裁决 NavigationRequest
  -> NetworkContext / URLLoader 发出请求
  -> redirect、response、policy 与 commit 决策
  -> 选择或创建目标 Renderer / document
  -> Blink 解析、style、layout、paint
  -> compositor 提交 CompositorFrame
  -> Viz 聚合 surface，GPU 或软件路径完成 raster / display
  -> 平台显示系统 present
```

这条线里有多个不能合并的“完成”：

| 阶段 | 它证明什么 | 它还不能证明什么 |
| --- | --- | --- |
| 请求发出 | 网络路径已经获得 request | DNS、TLS、response 或 commit 成功 |
| 收到 response | response headers/body 已进入加载链 | 页面已经切换或用户已经看到内容 |
| navigation commit | 新 document 已成为 frame 的当前文档 | layout、paint 或首帧已经完成 |
| paint | Renderer 生成了绘制记录 | frame 已提交、聚合或 present |
| frame submit | CompositorFrame 已跨过提交边界 | display 已采用该帧或用户已经看到 |
| present | 平台显示确认一帧进入显示链 | 业务数据、图片或异步组件全部 ready |

所以“白屏”不等于网络失败，“请求 200”不等于导航成功，“Renderer paint 了”也不等于屏幕已更新。全景图的意义，是让症状先落到生命周期阶段，再进入对应代码。

## Renderer 内部：网页代码如何变成可提交的一帧

Renderer 中最容易出现另一种过度简化：HTML 交给 Blink、JavaScript 交给 V8、绘制交给 Skia。真实路径由 Document、frame、event loop 和 rendering lifecycle 共同推进。

1. 网络数据进入文档加载和解析，构建 DOM，并可能触发脚本执行与资源请求。
2. Blink 通过 bindings 将 Web API 暴露给 V8；JavaScript 执行会再次修改 DOM、style 和任务队列。
3. style calculation、layout、pre-paint、paint 解决不同问题，触发条件和成本不同。
4. compositor 根据 layer/property trees 和更新状态决定 commit、activate、raster 与 submit。
5. Viz 在 Browser/GPU 侧组合来自多个 surface 的结果，最终进入平台 display。

Task、microtask、animation frame、timer、IPC reply 和生命周期更新会交错发生。一次 DOM 修改是否造成长帧，不能只看修改语句本身，还要看它是否强制同步 layout、扩大 invalidation、触发大量 paint，或与主线程上的其他 task 竞争。

## 导航不是唯一入口：五类动作对应五条不同主线

导航适合建立坐标，但不能代表所有 Browser 行为。遇到具体需求时，应先判断属于哪类动作：

| 动作类型 | 典型入口 | 主要路径 | 最关键的边界 |
| --- | --- | --- | --- |
| 跨文档导航 | 地址栏、链接、history、redirect | Browser navigation → network → commit → new document | old/new document、process selection、redirect 与取消 |
| 页面内更新 | DOM、JavaScript、CSS、animation | Blink/V8 task → style/layout/paint → compositor | main thread 时序、invalidation 与 frame lifecycle |
| 受权限设备能力 | Camera、Screen Capture、Location、Clipboard | Web API → Browser permission → device/service → platform | origin、frame、用户手势、OS permission 与 revocation |
| 本机对象 | 下载、file picker、PDF、打印 | network/page → Browser policy → system dialog/service | 用户选择、路径能力、扫描/转换和最终设备结果 |
| 产品与 Agent 能力 | Chrome UI、WebUI、Extension、DevTools、Runtime | product caller → Browser contract → service/runtime → current document | caller identity、allowlist、session、取消与版本兼容 |

这五类路径会共享 Mojo、Task、Profile 和日志等基础设施，但不能套用同一权限模型。例如网页下载、文件选择和打印都可能产出本机对象，却分别由网络完成、用户选择和系统打印链决定；Extension 能操作 DOM，也不因此获得网页 origin 或任意 Browser Native 权限。

## 产品接入：Chrome UI、WebUI、Extension 与 DevTools 不在同一权限层

Chromium 允许产品以多种方式接入，但它们的身份和生命周期不同：

- **Chrome UI / Views** 适合地址栏、窗口、菜单和平台原生交互。它运行在高权限 Browser 产品层，必须主动限制可调用能力。
- **WebUI** 使用受控 scheme/origin 和 Browser 提供的数据源、handler 构建产品页面。前端技术栈类似网页，不代表它与普通网站处于同一信任域。
- **Extension** 通过 manifest、permission、host permission、service worker、content script 和 Browser API 获得声明式能力。content script 能接触 DOM，但不应被当作网页或 Browser 的完整身份。
- **DevTools Protocol** 是高权限 target 控制协议，适合调试和自动化。remote debugging 的可达性本身就是安全边界，不能只当成一个开发端口。

选型不能只看“哪种 UI 写起来快”。要同时看 caller identity、是否需要 Browser owner、页面导航后如何失效、后台是否允许重启、能力怎样审计，以及发行时由谁更新。

## Network、媒体、文件与平台能力：统一接口不会抹平系统差异

`services/` 和平台抽象让上层可以通过相对稳定的 contract 使用网络、媒体、设备、数据解码等能力，但最终行为仍受 OS、driver、sandbox、用户权限与进程宿主影响。

一次网络请求在看到 HTTP 之前，可能已经经历 proxy selection、DNS、socket/QUIC connect、TLS/ALPN、network isolation key、cookie 和 cache 决策。一次 `getUserMedia()` 也不是“Renderer 打开摄像头”：Web 约束先进入 Browser 权限和设备选择，再由 media service 与平台 backend 启动 source，最后才形成 track 和首帧。

因此，跨平台代码的“接口一致”只证明调用方式相近，不证明故障、性能和权限体验一致。macOS、Windows、Linux 的媒体、字体、窗口、打印、凭据和图形后端必须分别验证。

## 六条横切边界决定功能是否真正成立

目录和进程之外，还有六条会同时穿过所有功能的规则。

### 1. 身份与安全

Site Isolation、sandbox、origin、frame/document、ChildProcessSecurityPolicy、permission 和 StoragePartition 解决不同层次的问题。进程隔离不自动授予数据权限，用户允许一次设备请求也不等于同 origin 永久获权。任何 Browser Native capability 都应重新验证 caller、目标对象、当前 document 和最小权限。

### 2. 异步与生命周期

`base::OnceCallback`、TaskRunner、Sequence、ThreadPool、WeakPtr 和 ref-counting 只解决部分执行与存活问题。对象活着不代表业务请求仍有效；旧 navigation、旧 document、已取消 session 或过期 deadline 的 reply 都应在 commit 前再次核验。

### 3. 配置与优先级

GN args 和编译条件决定代码是否进入 binary；Feature/field trial 决定运行路径；Policy 表达受管理环境约束；Pref 保存 Profile 状态；command line 常用于开发、门禁或受控部署。它们不是同一种开关，也不能仅凭最终值反推来源。

### 4. 资源与可靠性

RSS 上升不必然等于 leak，Renderer crash 不必然来自页面，GPU reset 也不必然是 driver 单点问题。必须先固定 workload、进程范围、采样窗口、build 和 Profile，再结合 heap、trace、crash dump、symbols 与恢复行为解释。

### 5. 可观测性

Debugger 证明某一时刻的调用栈，日志证明被记录的状态转移，trace 证明多进程时间关系，NetLog 证明网络事件，DevTools 证明页面/target 视角，测试证明被覆盖场景。没有一种证据可以单独替代全部层次。

### 6. 交付与版本

源码合入、package 发布、Distribution lock 更新、native build、签名、上传、channel 激活和真实客户端升级是独立状态。架构设计必须回答组件怎样兼容和回退，而不是只回答代码怎样调用。

## 从症状反推 owner：一张实用排障表

| 症状 | 优先划分的阶段 | 第一批证据 | 不要先下的结论 |
| --- | --- | --- | --- |
| 点击链接后没有切页 | UI action、navigation start、network、commit | Browser navigation 日志、NetLog、frame/document identity | “一定是前端路由问题” |
| 页面 200 但持续白屏 | commit、Renderer lifecycle、frame submit/present | DevTools、Renderer trace、Viz/frame timeline | “网络已经成功，所以 Browser 没问题” |
| Extension 偶发没有回复 | worker lifecycle、Browser dispatch、Runtime session、旧 document | Extension worker 日志、request id、Browser/Runtime trace | “Port 建立过，所以消息链可靠” |
| 同版本两台机器行为不同 | Policy、Pref、Feature/Variations、command line、Profile | effective config 与来源、GN/build identity | “代码随机” |
| 内存持续增长 | 进程分类、workload、cache、retained object、leak | Physical Footprint/RSS、heap、trace、时间窗口 | “RSS 上涨就是内存泄漏” |
| debug build 修好，安装包仍失败 | output、resource、branding、签名后 artifact、channel | GN args、Distribution lock、包内容与旧客户端 | “源码修复没有生效” |

排障应先确定失败发生在哪个“完成”之前，再搜索对应阶段的错误字符串。阶段划对后，源码入口、进程和工具才会迅速收敛。

## 一套可执行的源码阅读方法

### 第二步：从用户动作或系统事件开始

优先选择可复现入口：地址栏回车、Navigation commit、Extension message、permission prompt、BeginFrame、download completion、worker restart 或 crash recovery。不要从“我想读 `content/`”开始。

### 第三步：建立 owner 表

对每个阶段记录：谁创建状态、谁可以修改、在哪个进程/sequence、通过什么 interface、什么事件使其失效、失败由谁收口。owner 不明确时，继续追 constructor、factory、delegate、observer、bind 和 shutdown，而不是被 `Manager`、`Service` 这类名字说服。

### 第四步：把静态路径接回构建图

检查 `BUILD.gn`、target 依赖、平台条件、generated source 和当前 GN args。需要时用 `gn refs`、`gn desc`、Ninja graph 或链接产物确认实现进入当前 binary。

### 第五步：用运行证据证伪

根据问题选择 debugger、日志、trace、NetLog、DevTools 或测试。至少主动构造一次失败：redirect、导航取消、Renderer crash、worker 回收、Runtime 断连、GPU context loss 或 Profile 切换。happy path 只证明机制能工作，失败路径才能暴露 ownership 和恢复边界。

### 第六步：分层写结论

把结论拆成源码、开发 binary、Distribution package、真实客户端四层。只陈述已经验证的层次，并明确哪些平台、Profile、Feature 与异常路径尚未覆盖。

## 怎样判断自己真的读懂了

一份可交接的架构说明，至少应该让下一位工程师回答以下问题：

- 这段代码为什么进入当前 binary，属于哪个 target？
- 用户动作最先由谁接收，最终状态由谁拥有？
- 路径跨过哪些进程、sequence、Mojo 或系统 API？
- caller、origin、Profile、frame/document 和 request identity 在哪里校验？
- 正常完成、取消、断连、进程退出和重启分别怎样收口？
- Pref、Policy、Feature、Variations 与 command line 哪一层决定当前行为？
- 用什么日志、trace、测试、产物或客户端证据证明当前结论？

如果只能回答“相关代码在某个目录”，说明得到的仍是文件地图；如果能回答这些问题，才形成了可以用于设计、评审、排障和交付的架构模型。

## 工程结论

Chromium 的复杂度不来自目录太多，而来自同一个结果同时受构建输入、产品策略、进程隔离、状态 ownership、权限身份、异步生命周期和平台实现约束。五层坐标帮助我们找到职责，导航主线帮助我们看见一次端到端状态变化，六条横切边界则解释为什么“调用成功”经常仍不是“用户成功”。

## 继续阅读

- [二、Chromium 开发环境与调试实战：从源码拉取到多进程断点](/blog/40a6bb742d655024): 相邻章节的后续机制。

## 上游源码入口

文中的相对源码路径可从 [Chromium 官方上游快照](https://chromium.googlesource.com/chromium/src/+/b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b/) 定位。此入口保留原稿的上游阅读坐标，不包含任何产品定制代码，也不替代运行时验收。
