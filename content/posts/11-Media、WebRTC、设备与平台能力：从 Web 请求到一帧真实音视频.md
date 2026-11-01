---
id: "2ecb008f26f6fca6"
title: "11-Media、WebRTC、设备与平台能力：从 Web 请求到一帧真实音视频"
description: "从源码阅读入口、进程边界与验证条件理解Media、WebRTC、设备与平台能力：从 Web 请求到一帧真实音视频。"
date: null
topic: "principles"
tags: []
collection: "docs"
cover: "/media/2ecb008f26f6fca6-5d3ad8757a755784.webp"
---

从源码阅读入口、进程边界与验证条件理解Media、WebRTC、设备与平台能力：从 Web 请求到一帧真实音视频。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

![Chromium Media、WebRTC 与设备能力封面](/media/2ecb008f26f6fca6-5d3ad8757a755784.webp)

> 阅读坐标沿用原稿：Chromium `153.0.8010.37`，上游 commit `b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b`。本次同步未重新进行源码与目标平台运行时验收。

![Web 媒体请求如何经过授权、设备与平台后端](/media/2ecb008f26f6fca6-51ca494f95e491de.webp)

## 一句话结论

媒体播放、设备采集、桌面共享与 WebRTC 是相互连接但不同的链路；Web 约束只是请求，Browser 与操作系统共同完成授权和资源选择，最终帧能否产生还取决于 service、codec、驱动和设备状态。

网页里的 `<video>`、`getUserMedia()` 与 `RTCPeerConnection` 看起来像几行 JavaScript；实际一次视频通话、录音或屏幕共享跨过了 Web 语义、Renderer、Browser 授权、设备控制、媒体 service、系统 API 和网络传输。它不是“网页直接打开摄像头”，也不是“WebRTC 自动获得设备权限”。Browser 必须持续保有对 **谁在请求、允许什么、设备由谁占用、页面失效后如何停止** 的控制权。

阅读这一部分源码时，最实用的问题是：**这是一段媒体数据、一个设备控制请求，还是一次用户授权决定？它现在在哪个进程，下一跳是否还带着 document 和用户选择的身份？** 把三类事混在一起，是媒体问题最常见的误判来源。

## 先分清三条链：播放、采集与实时通信

“媒体”并不是一个单一路径。至少有三条常见链路，它们在 `<video>`、track 或 GPU 合成处相交，但其输入、权限和失败方式不同。

| 场景 | 起点 | Browser 主要决定什么 | 主要下游 |
| --- | --- | --- | --- |
| 播放远端媒体 | `<audio>` / `<video>` / MSE 等 Web API | frame、autoplay、URL/网络、解码资源与产品策略 | 网络、demux/decode、audio/video render、compositor |
| 采集本机媒体 | `navigator.mediaDevices.getUserMedia()` | 当前 document 是否可请求、用户是否授权、选哪台设备、何时停止 | 摄像头/麦克风设备、capture pipeline、MediaStream track |
| 实时通信 | `RTCPeerConnection` + local/remote track | Web 安全上下文、设备采集授权、网络/企业策略与可观测性 | WebRTC peer connection、ICE、RTP、编解码、jitter buffer |

屏幕共享 `getDisplayMedia()` 与摄像头采集相近，却不应简单继承 `getUserMedia()` 的授权结论：它涉及用户明确选择哪一个 screen/window/tab，以及选择结果是否仍对应当前请求。相同地，拿到 local track 也不等于网络已可通；WebRTC 的 signaling、ICE 候选、NAT、codec 协商与 RTP 媒体流仍是另一条待验证的链。

```text
Web API / document
  -> Blink request and constraint processing (Renderer)
  -> Mojo / Browser-side dispatcher
  -> Browser permission UI and product policy
  -> MediaStreamManager / device selection and control
  -> capture backend or Media Service
  -> MediaStream track / WebRTC / <video> renderer
  -> compositor, audio output, or network transport
```

这是理解边界的路线图，不是保证每次都经历的严格同步调用栈。播放不必经过设备 prompt，纯 remote track 不必打开本机摄像头；但 Browser-side identity、生命周期与资源控制不能被 Renderer 或第三方 Runtime 绕过。

## `getUserMedia()`：约束只是请求，不是对硬件的命令

在 Renderer 一侧，`third_party/blink/renderer/modules/mediastream/media_devices.*` 暴露 `MediaDevices` 行为，`user_media_processor.*` 将音频/视频 constraints、请求状态、成功与失败结果组织进 `MediaStream`/track 的生成过程。源码中既有 `GetUserMediaRequestSucceeded`/`Failed`，也专门处理请求已经取消后设备才返回的情形；这说明异步顺序不能被假设为“点击允许后一定立即得到 stream”。

网页提交的约束表达的是需求和可接受范围，例如希望音频、希望某个分辨率、是否需要回声消除。它并不获得设备句柄，也不能指定“必须把物理设备 X 永久交给我”。Browser 侧仍须检查 caller、权限、可用设备、设备忙碌状态与产品 policy，再由采集链路选择满足条件的能力。

| 现象 | 不能直接得出的结论 | 应沿哪条链排查 |
| --- | --- | --- |
| `getUserMedia()` rejected | “系统没有摄像头” | secure context、frame/embedding、用户拒绝、content setting、enterprise policy、constraints、设备状态 |
| prompt 显示且用户允许 | “Renderer 已经拿到图像” | Browser 回调、设备启动、track 创建、首帧与页面生命周期 |
| `enumerateDevices()` 结果有限 | “设备枚举坏了” | 设备权限前后的可见性、label 暴露规则、默认设备与 platform backend |
| track 创建成功却黑屏/无声 | “权限有问题” | capture 首帧、constraints、设备驱动、track 是否 enabled/ended、video render/audio output |

因此产品不应把一次成功的 prompt 当作永久、全局的“媒体授权 token”。授权至少要绑定请求类型、当前 document/frame、Profile 与可撤销状态；在 prompt 等待期间页面可能导航、Tab 可能关闭、frame 可能被销毁。后续回调必须检查请求是否仍有效，并关闭已经为失效请求启动的资源。

## Browser 是设备访问的控制平面

`content/browser/renderer_host/media/media_stream_dispatcher_host.*` 是 Renderer 媒体请求进入 Browser 的一个重要入口；`media_stream_manager.*` 负责把请求、设备枚举与生成过程协调到 Browser-owned 的媒体管理中。`media_devices_manager.*`、`video_capture_manager.*`、`audio_input_device_manager.*` 则显示设备清单、视频与音频采集并非由一段 Web 代码直接管理。

Browser 在这里承担的不是简单转发：它要把 Renderer 所说的“我要音频/视频”还原为具体 requester，向产品层请求 `RequestMediaAccessPermission`，选择或启动受控的设备会话，并处理 stop、设备变化、进程退出与页面失效。`media_stream_ui_proxy.*` 将授权 UI 与这条链衔接，也再次说明 prompt 属于 Browser/product 的交互与 policy，而不是 Blink 自行决定的界面。

```text
Renderer: MediaDevices / UserMediaProcessor
  -> Browser: MediaStreamDispatcherHost
     -> Browser policy/UI: permission request, user choice, cancellation
     -> Browser: MediaStreamManager + device managers
        -> capture service/backend
  <- stream descriptors, state and failure result
Renderer: build MediaStream tracks and attach to Web APIs
```

一个实现或 review 的最低要求，是把下列字段沿链传递并在关键边界复核：请求的 audio/video/display 类型、requesting frame/document、origin 与 embedding context、Profile/OTR、用户选择的设备或 display source、请求 id，以及取消/停止原因。只传一个 tab id 或 URL 字符串，无法可靠区分同一 tab 内的导航、iframe 或已经失效的 caller。

## 屏幕共享：授权的是一次可见来源选择

`content/browser/media/capture/desktop_capture_device.*` 及 `desktop_capture_device_mac.*` 表明桌面捕获有独立的 Browser/平台实现入口。屏幕、窗口、标签页等 source 的枚举与用户选择，带有比“允许摄像头”更强的可见性和产品语义：用户需要知道将共享什么，页面也不应悄悄把上一次选择重用于不相干请求。

- 内置扩展 可以发起“请求共享屏幕”的产品交互，但不能把自己持有的 session、tab 或 Runtime 权限解释成用户已经同意共享；
- Browser 可以在用户确认后把受限结果交给当前调用者，却不应把系统级 capture handle 暴露给 Extension、网页或 Runtime 的通用接口。

如果要做“协助用户共享当前 Tab”之类能力，contract 应明确 source 范围、调用者、用户确认、切换/停止、Tab 关闭和 navigation 后的行为；并分别在 macOS 与 Windows 上验收。平台系统的 Screen Recording、camera、microphone 授权可能在 Chromium prompt 之外再拦一次，二者都成功才代表真能产生媒体帧。

## WebRTC：本机采集只是 PeerConnection 的一部分

Blink 的 `third_party/blink/renderer/modules/peerconnection/peer_connection_dependency_factory.*` 建立 WebRTC peer connection 相关依赖；`third_party/webrtc/` 承担实时通信实现的更深层细节。`PeerConnection` 将 local/remote track、candidate、transport 与 codec 协商组织成实时会话，但 signaling 通常由站点自己的 HTTP/WebSocket 服务完成，不是 Chromium 自动替应用连接的“信令服务器”。

从问题归因看，至少拆成四段：

```text
local capture: permission -> device -> local track
signaling: offer/answer/candidate exchange through application service
connectivity: ICE/STUN/TURN, routing and enterprise network policy
media: codec negotiation -> RTP -> jitter/decode/render
```

所以“本地预览正常但对端没有画面”通常不能再回到摄像头 permission 一条线上死查；它可能是 signaling 没交换完成、candidate 不可达、DTLS/codec 不匹配，或 remote track 没有正确 attach。反过来，“ICE connected”也不证明本机采集质量、音频输出和页面渲染都正确。每段都需要各自的日志、stats 或 trace 证据。

Browser 侧的 `peer_connection_tracker_host.*` 与 Blink 的 tracker 入口可帮助把诊断关联到实际 PeerConnection；Chrome 的 WebRTC browser tests 还覆盖了 `getUserMedia` 允许、拒绝、display media 等交互情形。它们是定位起点，不能替代目标网络、TURN 配置和真实设备上的端到端验收。

## 媒体服务与平台后端：统一接口不抹平系统差异

`content/browser/media/media_service.cc` 与 `media/mojo/services/media_service.*` 表示部分媒体能力可以通过服务化边界提供；视频采集、音频输入、解码与输出在不同路径上会与 service、GPU/utility process 或平台设施配合。其进程划分和 feature 开关不宜凭目录名下结论，应以当前 target、trace 和实际启动的 process 为准。

更靠近硬件的代码必然分平台。当前基线可见 `media/capture/video/apple/video_capture_device_avfoundation.*` 和 `media/capture/video/win/video_capture_device_win.*`。它们说明上层 Web API 相同，并不代表下层枚举、格式协商、权限弹窗、设备断开、沙箱授权或驱动问题会一致。

| 层次 | 希望保持稳定的东西 | 必须允许不同的平台差异 |
| --- | --- | --- |
| Web/Blink | API 语义、promise/track 生命周期、约束与错误模型 | feature 支持、用户手势与权限策略的实际组合 |
| Browser policy | caller 身份、用户确认、Profile/OTR 边界、可撤销性 | 产品 UI、企业 policy、系统授权结果 |
| capture/media | 设备会话、buffer、格式与停止语义 | AVFoundation、Windows backend、驱动、可用硬件 |
| presentation | track 可供页面消费 | GPU/软件路径、显示器、音频设备与系统输出 |

跨平台开发的正确目标不是“让 macOS 和 Windows 的类名相同”，而是先冻结产品层 contract 和可观测结果，再为每个平台写可以发现其系统限制的验收。把 macOS 上已允许的 Screen Recording 结果外推到 Windows 机器，或把 CI 的 fake device 结果当成实体摄像头可用，都会漏掉最关键的失败面。

## 建议的追踪任务：解释一次“允许摄像头后仍无画面”

不要先改权限代码。按下面顺序收集事实，才能将故障放入正确层次：

1. 记录 requesting URL、top-level/iframe、Profile/OTR、constraints、用户选择与页面是否在等待期间导航。
2. 在 Renderer 观察 `MediaDevices`/`UserMediaProcessor` 的 request、result、track 状态和约束失败原因。
3. 在 Browser 关联 `MediaStreamDispatcherHost`、permission UI、`MediaStreamManager` 与目标设备的启动/停止事件。
4. 在平台侧验证系统 camera/microphone/screen 授权、设备枚举、驱动和首帧；macOS 与 Windows 分开记录。
5. 若问题属于 WebRTC，再独立采集 signaling、ICE、selected candidate pair、codec 与 inbound/outbound stats，确认 remote track 是否实际渲染。
6. 最后才检查 `<video>` attach、autoplay/mute、compositor/GPU 与音频输出。

这条链的价值是让“用户点了允许”只成为一个中间事实：它既不能证明硬件已启动，也不能证明实时连接成功，更不能证明用户授权仍然属于现在这个 document。

## 本文已核验的源码锚点

| 主题 | 源码入口 |
| --- | --- |
| Web media / user media | `third_party/blink/renderer/modules/mediastream/media_devices.*`、`user_media_processor.*`、`web_media_player_ms.*` |
| Browser 媒体请求与设备管理 | `content/browser/renderer_host/media/media_stream_dispatcher_host.*`、`media_stream_manager.*`、`media_devices_manager.*` |
| 音视频采集 | `video_capture_manager.*`、`audio_input_device_manager.*`、`media/capture/`、`media/audio/` |
| 授权 UI 与桌面捕获 | `media_stream_ui_proxy.*`、`content/browser/media/capture/desktop_capture_device.*` |
| WebRTC 接合 | `third_party/blink/renderer/modules/peerconnection/peer_connection_dependency_factory.*`、`content/browser/renderer_host/media/peer_connection_tracker_host.*`、`third_party/webrtc/` |
| Media service 与平台后端 | `content/browser/media/media_service.cc`、`media/mojo/services/media_service.*`、`media/capture/video/apple/`、`media/capture/video/win/` |

## 运行时验证路径

- 在 macOS 与 Windows 分别测试 camera、microphone、screen/window/tab capture 的 allow、deny、dismiss、撤销、设备拔出、Tab 关闭和导航取消；记录 Browser prompt 与系统 prompt 的先后和结果。
- 用真实设备及 fake device 各跑一次 `getUserMedia`，区分 Web permission 成功、设备启动成功、首帧到达和页面渲染成功四个状态。
- 对一条 WebRTC 通话采集 `webrtc-internals`/stats、Browser trace 与网络日志，分别证明 signaling、ICE、codec 和 local/remote track 的状态。

## 从故障反推边界：用户点了允许，为什么仍然没有画面

“允许”只完成权限阶段。之后还要确认 constraints 选择出实际设备、操作系统授权没有拒绝、capture session 能启动、首个 frame 抵达、format/codec 可被后续链路消费、track 没有 mute/ended，最后页面或 WebRTC sender 正确使用它。每一步都有不同 owner 和日志。

对屏幕共享还要额外记录用户选择的 source、系统录屏权限、窗口消失或屏幕拓扑变化，以及 stop indicator 的撤销路径。Agent 若需要读取画面，不应复用一次陈旧授权无限捕获；应把 source、调用者、会话、可见提示、停止动作和结果去向绑定为一次受审计 capability。

## 播放链与采集链在中间才汇合

媒体播放从网络/MediaSource/本地资源进入 demux、decode、audio/video renderer 和输出设备；采集从权限、设备枚举、source 启动进入 track，再可能送往页面预览、录制或 PeerConnection。它们会共享 codec、buffer、时钟和平台后端，却有不同的授权、故障和生命周期。

排查“视频黑屏”时，先区分资源没有数据、demux/codec 不支持、decode 失败、video frame 未到 renderer、compositor 没提交，还是 autoplay/可见性策略阻止。排查“摄像头无画面”则先看 permission、设备选择、OS 授权、capture source、track state 和首帧。用同一个 Media error 文案覆盖两条链，会让证据无法收敛。

## 设备授权是 Browser 与操作系统的两级裁决

Web permission 通过只说明 Browser 允许当前 origin/frame 请求；macOS TCC、Windows privacy setting、企业 policy、设备占用和 driver 仍可能拒绝。反过来，OS 已授权应用，也不意味着任意网页都可以访问设备。

一次可靠采集应记录：requesting origin、top-level frame、document、user activation、requested constraints、Browser permission result、selected device/session id、OS result、source started、first frame/audio sample。这样才能区分“用户拒绝”“系统拒绝”“设备不存在”“constraint 无解”和“启动后无数据”。

屏幕共享还多一个可见 picker 和 source 生命周期。用户选择窗口、屏幕或 Tab 后，source 可能关闭、最小化、改变尺寸或被系统撤销；产品不能把一次 picker 结果持久化为以后静默捕获的永久能力。

## Constraints 与设备选择不是精确命令

`getUserMedia()` constraints 表达 ideal/exact/min/max 等偏好和约束，Browser/media layer 需要在可用设备与格式中求解。请求 1080p 不保证摄像头按这一格式输出，也可能由内部转换得到；过度 exact 约束则可能直接产生 overconstrained error。

调试分辨率、帧率或设备错误时，应同时记录原始 constraints、最终 settings、source format 和变换路径。只打印调用参数，会把“请求”和“实际工作模式”混为一谈。

## MediaStreamTrack 有独立生命周期

页面拿到 stream 后，track 可能 mute/unmute、enabled/disabled、ended；页面隐藏、设备拔出、source 错误和用户停止共享会产生不同状态。多个 track 还可能共享同一个底层 source，停止一个 track 不一定立即关闭设备，反之 source 结束会影响所有消费者。

导航、BFCache、Renderer crash 与 Permission 撤销时，Browser 和 media service 必须释放或重新绑定资源。长期 Agent/会议场景尤其要监控“页面已离开但设备指示灯仍亮”“重连后重复打开 source”和“旧 track 回调写入新会话”。

## WebRTC 还要经过传输与协商

本地预览成功只证明 capture 和本地 render 路径成立。PeerConnection 还包括 SDP/codec negotiation、ICE gathering、STUN/TURN、DTLS/SRTP、拥塞控制、jitter buffer、网络切换和远端 decode。远端黑屏可能来自本地未发送、网络丢包、协商不匹配或远端渲染。

验证时至少区分 local track produced、sender encoded、packets sent、remote packets received、decoder output 和 remote frame rendered。`webrtc-internals`、trace、网络统计和平台日志应围绕同一个 peer/session id 对齐。

## Codec、GPU 与平台后端改变真实路径

硬件 encode/decode 是否可用受平台、GPU、driver、分辨率、codec profile、sandbox 和 feature 控制。软件 fallback 能提高兼容性，却可能显著增加 CPU、功耗和热压力；硬件路径成功初始化也不保证长期不会 reset。

一次跨平台媒体验收应记录实际 codec、profile、hardware/software implementation、分辨率/帧率、CPU/GPU、功耗、丢帧与恢复。不能用一台开发机的 codec 支持推断所有用户环境，更不能把 `--disable-gpu` 下的成功当成最终修复。

## 一套覆盖长期运行的验证矩阵

除首次允许和首帧，还应覆盖：拒绝后再次请求、OS 权限运行中撤销、设备插拔、默认设备切换、窗口/屏幕 source 关闭、页面导航、Tab 后台、Renderer crash、media service restart、网络从有线切 Wi-Fi、PeerConnection 重协商和长时间运行。

每个场景分别记录 permission、source、track、transport 和 render 状态。最终产品通过条件不仅是“再次有画面”，还包括设备正确释放、没有重复 session、用户能理解失败、恢复不会把旧流接进新 document。

## 音频链需要单独看时钟、设备与系统策略

音频没有“画面黑掉”这种直观信号。采集 sample、Audio Service、处理/回声消除、编码传输、解码、输出 device 和系统 mixer 任一阶段都可能产生静音、爆音、延迟或漂移。页面中的 track `live` 不代表输出设备真的发声。

排障应记录 input/output device、sample rate、channel layout、buffer/underrun、mute/volume、system route 和 WebRTC audio stats。蓝牙设备切换常伴随 profile、采样率与延迟变化；默认设备变化时，Browser 是否迁移现有 stream 取决于平台和产品策略，不能只在内置扬声器上验收。

音视频同步还依赖共同时间基准、jitter 和 renderer 调度。单独优化 video frame 或 audio buffer，可能改善一侧却放大 lip-sync 偏差；长期会议应同时观察 A/V drift、device change 与 network recovery。

产品还要保证采集指示与真实 source 生命周期一致：设备已停止时及时撤下提示，仍在采集时不能因页面 UI 消失而隐藏状态。隐私指示本身也是媒体验收的一部分。

## 工程结论

媒体能力是一条跨 Web、Browser、service、硬件和 OS 的资源生命周期。只有把“请求允许、设备启动、首帧到达、持续传输、用户停止、资源释放”分别验收，才算说明真实能力。

## 继续阅读

- [10-安全、存储与身份边界：谁能代表哪个站点、读到哪份数据](/blog/b577f62efe84363c): 相邻章节的前置机制。
- [12-测试、Tracing、性能与排障：为一次跨进程改动建立证据链](/blog/d9de787e5775c326): 相邻章节的后续机制。

## 上游源码入口

文中的相对源码路径可从 [Chromium 官方上游快照](https://chromium.googlesource.com/chromium/src/+/b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b/) 定位。此入口保留原稿的上游阅读坐标，不包含任何产品定制代码，也不替代运行时验收。
