---
id: "636da0fdc5bcbe17"
title: "08-Compositor、Viz、Skia 与 GPU：一帧如何真正到达屏幕"
description: "从源码阅读入口、进程边界与验证条件理解Compositor、Viz、Skia 与 GPU：一帧如何真正到达屏幕。"
date: null
topic: "principles"
tags: []
collection: "docs"
cover: "/media/636da0fdc5bcbe17-a62f54d42c08ed14.webp"
---

从源码阅读入口、进程边界与验证条件理解Compositor、Viz、Skia 与 GPU：一帧如何真正到达屏幕。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

![Chromium 一帧从 Compositor 到屏幕的渲染旅程封面](/media/636da0fdc5bcbe17-a62f54d42c08ed14.webp)

> 阅读坐标沿用原稿：Chromium `153.0.8010.37`，上游 commit `b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b`。本次同步未重新进行源码与目标平台运行时验收。

![Chromium 一帧从 Renderer 到屏幕的生命周期](/media/636da0fdc5bcbe17-92423fb291f24d8d.webp)

## 一句话结论

Renderer 产出 paint/compositor 输入后，仍要经过 commit、activate、raster、CompositorFrame、Viz aggregation 与平台 present；排查卡顿或旧画面时，应先确认慢在生命周期哪一段，而不是笼统归因于“GPU”。

Renderer 得到 paint/compositing 输入时，仍然不是用户看到的一帧：它只是“这次页面想画什么”。接下来 Chromium 要在合适的 BeginFrame 时机组织 layer tree、生成 `CompositorFrame`、跨进程交给 Viz，把多个页面/Browser UI 的 surface 合成，再经 Skia 和 GPU 或软件后端提交给操作系统显示系统。

因此，排查“页面没显示”“动画掉帧”时，最容易犯的错误是只盯 Blink paint，或者看到 GPU 进程存在就认定 GPU 已经完成绘制。更可靠的问题序列是：**Renderer 有没有产出 frame？Viz 有没有接收和聚合？输出 surface 是否能 submit/present？用户看到的是哪一个 frame？**

## 一帧的最小主线

以下是桌面 Chromium 的通用阅读骨架。它表达 ownership 和边界，不承诺每个 feature、平台或测试模式都采用同一线程/进程形态。

```text
VSync / BeginFrame source
  -> Renderer WebFrameWidget / cc::LayerTreeHost 决定是否需要 main frame
  -> Blink 生命周期更新、paint property、layer tree / raster 输入
  -> Compositor 产出 viz::CompositorFrame
  -> CompositorFrameSink 经 Mojo 提交给 Viz
  -> Viz 维护 Surface 与 frame sink，聚合页面、Browser UI、video 等 frame
  -> Display / SkiaOutputSurface 选择 GPU 或软件输出路径
  -> GPU service、driver 与平台 surface 执行 submit/present
  -> OS compositor / display scanout，用户看见一帧
```

“frame”在这条线里至少有三种语义：Renderer 提交的 `CompositorFrame`、Viz 聚合后的 display frame、显示系统已经 present 的图像。性能指标、截图、输入响应和用户肉眼观察分别可能落在不同阶段；写埋点或下结论前必须先说明采用哪一种。

## 四个角色，各自不替对方背锅

| 角色 | 主要职责 | 常见误解 |
| --- | --- | --- |
| Blink / Renderer compositor | 将 document 的可绘制状态组织为 layer tree，按帧节奏提交内容 | paint 完成就已经显示 |
| `cc` | 提供 compositor 调度、layer tree、tile/raster 协作等通用机制 | `cc` 只是一层数据结构，不影响时序与吞吐 |
| Viz | 管理 frame sink、surface、BeginFrame、聚合与 display 输出 | Viz 等同于 GPU 进程，或只负责“转发 frame” |
| Skia / GPU service / platform | 栅格、resource、图形 API/driver 交互和最终 surface 提交 | 有 GPU 就一定硬件加速且永不掉帧 |

它们的分层避免 Renderer 直接管理桌面窗口、驱动和其他页面的最终合成。Browser 也不需要把每个 tab 的绘制结果同步拷贝到自己的内存再画一次；它通过 `RenderWidgetHost`、frame sink 与平台视图参与协调，但页面 content 的生产仍由 Renderer 负责。

## BeginFrame：不是“每 16ms 强制重画”

`BeginFrame` 是一轮合成工作的节奏信号。它带有 frame 时间、序号和 deadline 等信息，使观察者能决定这一轮是否需要更新、是否来得及提交、没有内容时如何 acknowledge。它既可能来自显示刷新，也可能在特定条件下由内部或 synthetic source 驱动；后台、不可见、被 throttle 的页面更不能按“每次 VSync 必画”理解。

源码中可从 `cc/mojo_embedder/async_layer_tree_frame_sink.cc` 进入：`OnBeginFrame()`、`SubmitCompositorFrame()`、`DidNotProduceFrame()` 和 `DidReceiveCompositorFrameAck()` 将 BeginFrame、提交和 ack 串起。对应的 `cc::LayerTreeHost` 是 Renderer compositor 的核心阅读入口；Blink 的 `WebFrameWidgetImpl::BeginMainFrame()` 则把 Web frame/widget 生命周期接到这套 compositor 调度。

这带来两个实际约束：

- 某次 JavaScript/DOM mutation 发生，不代表它必然在下一次物理刷新前被画出；main thread 忙、raster 资源未就绪、frame 被合并或 throttle 都会影响结果。
- 收到 BeginFrame 也不代表一定提交一个新 frame。没有可见变化、被 defer、发生丢帧或资源条件不满足时，`DidNotProduceFrame` 同样是正确协议行为。

因此测“掉帧”不能只数 `requestAnimationFrame` 回调。至少同时观察 BeginFrame、Renderer submit、Viz ack/present；否则无法区分页面没更新、来不及提交、Viz 没使用，还是输出端没有 present。

## 从 layer tree 到 CompositorFrame：commit、activate、raster 不是一件事

`cc::LayerTreeHost` 让 main thread 的页面状态与 compositor 消费的状态可以按帧协作。阅读时至少将下面三类工作分开：

| 阶段 | 关心的问题 | 不能简化成 |
| --- | --- | --- |
| Commit | main thread 的 layer/property/动画状态何时同步给 compositor | DOM 已变就一定立即可画 |
| Activate | 某个已准备状态何时成为当前可用于 draw 的 active state | commit 完成就已显示 |
| Raster / resource | picture、tile、image 等怎样变成可供 draw 的资源，是否受 budget/优先级约束 | GPU raster 一定无 CPU 成本或绝不阻塞 |

同一个视觉改动可能只要求属性动画合成，也可能要求 main thread 重算、重新 paint、raster 或更大的 surface 更新。DOM/style/layout/paint 的变化，不能直接反推这里的 commit/raster 成本；反过来，一个 GPU 活跃也不说明 Renderer 的 layout 很快。性能问题必须定位到实际跨过的阶段。

## `CompositorFrameSink` 与 Surface：跨边界提交的对象是什么

Renderer 不把“屏幕像素”直接发给 Browser。它提交的是 `viz::CompositorFrame`，其中包含 render pass、resource、damage、metadata 等合成输入；具体 resource 是否共享、如何同步、是否为软件路径，取决于 context 与平台配置。

这一边界在基线源码中有清晰的三组入口：

| 位置 | 说明 |
| --- | --- |
| `third_party/blink/renderer/core/frame/web_frame_widget_impl.cc` | `WebFrameWidgetImpl` 持有/使用 `LayerTreeHost`，是 Web widget 通向 compositor 的阅读入口。 |
| `cc/mojo_embedder/async_layer_tree_frame_sink.cc` | `AsyncLayerTreeFrameSink::SubmitCompositorFrame()` 通过 `CompositorFrameSink` 消息端点提交 frame，并接收 BeginFrame/ack。 |
| `content/browser/renderer_host/render_widget_host_impl.cc` | `RenderWidgetHostImpl` 创建并把 frame sink 端点交给 Browser 侧 `HostFrameSinkManager`；注释也明确 Renderer 可能在 context loss 后请求新的 sink。 |

`FrameSinkId` 和 `LocalSurfaceId` 解决的不是“给一个窗口取名字”，而是标识 frame 的生产者及其 surface 生命周期。尺寸、device scale factor、嵌入关系或 output surface 变化时，旧 surface 不能被无条件复用；错误地复用或错误归属 frame sink，常表现为黑块、旧帧、input 坐标不一致或嵌入内容消失。

## Viz：从多个 surface 到一个 display

Viz 不是单页 Renderer 的后处理器。它需要管理多个 frame sink 和 surface，将网页、Browser chrome、iframe/嵌入内容、video overlay 等可组合输入按嵌入关系聚合为 display output。`components/viz/service/frame_sinks/frame_sink_manager_impl.*` 和 `components/viz/service/display/surface_aggregator.*` 是理解这件事的两个核心入口：前者管理 sink/surface 的服务侧状态，后者执行 surface aggregation。

这解释了为什么“Renderer 交帧了但窗口还是旧画面”是可能发生的：frame 也许还没有被用于当前 aggregation，输出 surface 可能不可用，damage 可能为空或被覆盖，窗口/视图可能正在隐藏或重建。反之，页面本身不 repaint，Browser UI 也可能提交自己的 surface，导致用户仍看到窗口局部变化。

阅读 Viz 时推荐使用以下表格记录证据：

| 要验证的结论 | 静态入口 | 运行时证据 |
| --- | --- | --- |
| Renderer 是否真的提交新 frame | `AsyncLayerTreeFrameSink::SubmitCompositorFrame()` | trace 中的 submit、frame token/sequence |
| Browser 是否创建/连接对应 frame sink | `RenderWidgetHostImpl` 的 `CreateCompositorFrameSink` 路径 | Mojo/trace 与目标 `FrameSinkId` |
| Viz 是否使用该 surface | `FrameSinkManagerImpl`、`SurfaceAggregator` | viz trace、surface/frame 激活记录 |
| 是否产生输出和 present | `Display`、`SkiaOutputSurface`、平台视图 | GPU/viz trace、swap/presentation feedback |

## Skia、GPU service 与平台输出：后端不是一个固定选项

`components/viz/service/display/skia_output_surface.*` 与 `display_embedder/skia_output_surface_impl*` 是 display 输出的核心阅读入口；`components/viz/service/gl/gpu_service_impl.*` 则连接 GPU service 的初始化与服务能力。它们共同把 Viz 的合成结果交给图形后端，但“用 Skia”不自动等于“在独立 GPU 进程以某一种 API 完成所有绘制”。

实际后端可能随操作系统、driver/blocklist、命令行、headless、remote desktop、context loss、软件 fallback 和 feature flag 变化。macOS、Windows、Linux 对 native surface、presentation feedback 和窗口嵌入的实现也各不相同。`RenderWidgetHostViewMac`、Windows/Aura 等平台 view 文件可以作为平台差异的落点，但不应从某个平台类名反推桌面 Chromium 的通用执行时序。

特别要把两个失败面分开：

- **GPU/context 失败**：context loss 或 driver/reset 可能导致 compositor frame sink 被重建、resource 失效或进入 fallback。
- **present/窗口失败**：即使 render pass 已完成，窗口不可见、surface 尺寸变化、OS compositor 节奏或 presentation 反馈仍可能让用户没有在预期时刻看到它。

它们都可能在 UI 上表现为白屏或卡顿，却需要从不同 trace category、进程日志和平台图形诊断开始。

## 性能与排障：用 frame 生命周期定位，不用目录猜

| 现象 | 首先判断 | 典型下一跳 |
| --- | --- | --- |
| JS 已执行、界面没变化 | DOM/style/paint 是否真的产生可合成更新 | Renderer lifecycle 与 invalidation，再看 `LayerTreeHost` 是否请求 frame |
| 动画回调正常但肉眼掉帧 | BeginFrame、main frame、submit、ack/present 是否缺一环 | `AsyncLayerTreeFrameSink`、viz trace、GPU/presentation feedback |
| 新 Renderer frame 后显示旧画面 | frame sink/surface 是否仍匹配、Viz 是否聚合 | `RenderWidgetHostImpl`、`FrameSinkManagerImpl`、`SurfaceAggregator` |
| 黑屏或 context loss 后恢复异常 | sink 是否重建、resource/context 是否重新建立 | Browser 侧 create sink、GPU service、平台 view |
| 只在某平台或远程环境出现 | 实际图形后端、driver、headless/remote 配置 | GN args/命令行、GPU 信息、对应平台 output/view 实现 |

一次 Performance trace 看见 “Paint” 并不足以完成这张表；同样，任务管理器里 GPU usage 升高也不能证明内容已 present。每次结论都应明确所观察的 frame id/token、进程和阶段。

## 运行时验证路径

- 在 macOS 与 Windows 各录制一次包含 `BeginFrame`、`LayerTreeHost`、Viz、GPU/presentation 的 trace，用同一 frame token 对齐 Renderer submit 与可见结果。
- 人为触发 resize、Tab background/foreground、Renderer crash 和 GPU/context loss，登记 `FrameSinkId`/surface 的重建与用户可见恢复行为。
- 分别对纯 DOM animation、transform/opacity animation、视频/Canvas 做一次测量，验证它们实际经过 main thread、raster 与 Viz 的范围。

## 从故障反推边界：提交了一帧，为什么用户仍看到旧画面

Renderer submit 只说明一个 `CompositorFrame` 进入后续链路。Surface dependency 可能尚未满足，Viz aggregation 可能等待其他 surface，raster/upload 可能阻塞，display scheduler 可能错过 deadline，平台 swap/present 也可能延后；后台 Tab、遮挡、功耗策略和 GPU context loss 还会改变调度。

因此截图、录屏、低延迟 overlay 或自动化视觉判断都要写清采样点。抓到 Renderer-side paint artifact、Viz aggregated frame 和操作系统已 present 的画面代表不同事实。若产品要求“动作完成后截图”，还需定义等待条件、超时、navigation/resize 时的失效语义，避免把上一帧误当作当前结果。

## Frame pipeline 是生产者与消费者的协作

Renderer 主线程产生 DOM/style/layout/paint 状态，compositor thread 管理 layer tree 和 frame 提交，Viz/GPU 侧聚合 surface 并驱动 display。各阶段存在队列和节奏控制，不是上一阶段完成就立刻同步执行下一阶段。

BeginFrame 提供一次产生新帧的机会，Renderer 可以因为没有 damage、主线程未完成或被节流而不提交；display 也可能因为 backpressure、surface dependency 或平台调度没有立即采用新 frame。分析掉帧时，应判断是生产者没按时产出、frame 在提交/聚合中等待，还是 present 被平台延后。

## Commit、Activate 与 Draw 为什么分开

主线程更新的 layer tree 通常需要 commit 到 compositor side，再等待资源和依赖达到可激活状态。active tree 用于真正 draw，pending tree 可以并行准备下一状态。这种双树/流水设计避免主线程更新直接破坏当前可显示帧，却也带来“代码执行了，画面晚一帧甚至多帧”的现象。

如果 commit 很快但 activate 等待，应查看 raster/resource readiness；如果 activate 完成但没有 draw，检查 damage、visibility、BeginFrame 和 display 调度；如果 submit 完成但画面没变，继续看 surface aggregation 与 present feedback。把这些阶段合并成一个“composite”指标会掩盖根因。

## Surface identity 解决跨组件合成的生命周期

Viz 不只接收一个页面的一张 bitmap。Browser UI、页面、iframe、视频、popup 等内容可能通过不同 CompositorFrameSink 和 surface 组合。SurfaceId/LocalSurfaceId 帮助系统识别某个尺寸、scale 与生命周期下的 frame 序列，parent surface 通过引用组合 child surface。

当 child surface 尚未提交、已被替换或引用关系不完整时，聚合器可能继续使用旧 surface、显示 fallback，或等待依赖。这类问题看上去像“iframe 没刷新”“视频停在旧帧”，却不一定发生在 Blink paint。应同时记录 frame sink、surface id、submit/aggregate/present 时序。

Surface 生命周期还决定资源何时可以回收。过早释放会产生缺帧或 GPU 错误，过晚释放则会堆积纹理和内存。进程崩溃、Tab 隐藏、缩放/旋转和窗口 resize 都可能创建新的 local surface identity，是故障注入的重要场景。

## Raster、Skia 与 GPU 后端不是一条固定路线

Paint 产生的绘制记录可以按 tile raster，后端可能使用 GPU、软件或平台特定组合；Skia 提供绘制与图形能力，ANGLE/驱动/系统 compositor 继续参与最终显示。不同设备、driver blocklist、feature flag 和 context 状态会改变实际路径。

因此一次 GPU 问题必须记录 GPU process、backend、driver、feature status、是否 software fallback 和 context loss。只在开发机关闭 GPU 后“恢复正常”，只能定位到图形路径相关，不能直接得出应在产品中全局禁用 GPU。

## 将卡顿拆成四种类型

| 类型 | 典型表现 | 首要证据 | 常见根因方向 |
| --- | --- | --- | --- |
| Main-thread jank | 输入、脚本、layout 同时推迟 | Renderer main trace、long task | JS、同步 layout、大范围 style/paint |
| Compositor miss | 主线程空闲但帧没按节奏提交 | compositor scheduler、BeginFrame | commit/activate、资源等待、节流 |
| GPU/Viz stall | submit 后聚合或 draw 慢 | Viz/GPU trace、surface/resource | raster、纹理、driver、context loss |
| Presentation delay | draw 完成但 present feedback 晚 | display/present timing、OS 工具 | vsync、窗口系统、显示器/平台策略 |

实际问题可能同时跨多类。例如主线程晚提交导致 GPU 空闲，随后大批 raster 又造成 GPU 峰值。分析应以同一 frame sequence 对齐阶段，而不是分别截取 CPU 和 GPU 的最高点。

## 一次视觉回归怎样完成验证

以“AI 侧边栏展开时页面闪旧画面”为例，先给侧边栏 resize/visibility 动作和页面 frame 建立 trace marker；检查 Renderer 是否提交包含新 viewport 的 frame、Viz 是否聚合了正确 child surface、present feedback 是否对应新 frame。再分别验证普通页面、视频/iframe 页面、不同 scale factor、窗口 resize 与 GPU fallback。

截图对比只能证明最终像素差异，无法解释旧帧来自 paint、surface 还是 present。将截图与 frame timeline、surface identity 和 GPU 状态结合，才能把修复写成稳定 contract。

## 截图、录屏与用户所见也可能不是同一帧

DevTools screenshot、tab capture、系统录屏和肉眼观察可能从不同 surface 或 presentation 阶段取样。定位“截图正确但屏幕闪烁”时，要记录采样源与 frame token；否则一张截图会错误地排除 display/present 问题。跨显示器、不同 refresh rate、HiDPI scale 和窗口遮挡也应进入平台验收，而不是只在固定开发屏幕检查。

## 工程结论

帧生命周期把“页面想画什么”和“用户真的看见什么”隔开。性能优化与视觉能力应尽量沿现有 surface/frame ownership 接入，并用同一 frame identity 对齐 trace，而不是绕过 Viz/GPU 生命周期。

## 继续阅读

- [07-导航、Network Service 与缓存：URL 如何成为一个已提交的页面](/blog/3258863e9aeaacd8): 相邻章节的前置机制。
- [09-Chrome UI、WebUI 与 Extension：产品能力如何接到 Browser](/blog/d25d0d5dd8ee92dd): 相邻章节的后续机制。

## 上游源码入口

文中的相对源码路径可从 [Chromium 官方上游快照](https://chromium.googlesource.com/chromium/src/+/b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b/) 定位。此入口保留原稿的上游阅读坐标，不包含任何产品定制代码，也不替代运行时验收。
