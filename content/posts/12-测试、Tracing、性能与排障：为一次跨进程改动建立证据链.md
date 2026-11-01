---
id: "d9de787e5775c326"
title: "12-测试、Tracing、性能与排障：为一次跨进程改动建立证据链"
description: "从源码阅读入口、进程边界与验证条件理解测试、Tracing、性能与排障：为一次跨进程改动建立证据链。"
date: null
topic: "principles"
tags: []
collection: "docs"
cover: "/media/d9de787e5775c326-6dec82c9a8e963a5.webp"
---

从源码阅读入口、进程边界与验证条件理解测试、Tracing、性能与排障：为一次跨进程改动建立证据链。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

![Chromium 测试、Tracing 与排障证据链封面](/media/d9de787e5775c326-6dec82c9a8e963a5.webp)

> 阅读坐标沿用原稿：Chromium `153.0.8010.37`，上游 commit `b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b`。本次同步未重新进行源码与目标平台运行时验收。

![从测试、日志和 Tracing 到发布验收的证据链](/media/d9de787e5775c326-2b96010b1d1ea792.webp)

## 一句话结论

Chromium 排障应先定义要证明的事实，再选择单测、browser test、trace、metric、目标平台回归与客户端验收，不能靠不断增加日志代替问题定义。每种证据都有边界，也不能相互冒充。

Chromium 排障最危险的动作，是看到一个现象后直接在“看起来相关”的进程里改代码。地址栏导航、WebUI 按钮、Extension 调用、媒体授权和 frame 提交都会跨进程；一个局部单测通过，只能证明局部契约没有立刻破坏，不能证明用户操作走到了它。

更可靠的做法是把测试、trace、日志和指标看成不同强度的证据：**测试定义应保持的行为，Tracing 还原某次运行的时序，日志解释分支选择，metrics 判断它是否在一组真实会话中退化。** 它们相互补充，不能互相替代。

## 先决定要证明哪一种事实

一次改动通常同时带来四类问题，若不先分开，团队很容易用不相干的证据宣布“已验证”。

| 要回答的问题 | 合适的主证据 | 仍然不能推出的结论 |
| --- | --- | --- |
| 一个纯函数、状态机或 Mojo 参数是否符合 contract | unit test | Browser、Renderer 与产品 UI 一定以该方式接入 |
| 用户操作能否跨进程完成、取消与回收 | browser test / integration test | 真实网络、设备和所有平台完全一致 |
| 某次运行实际在哪个线程、进程、时间段卡住 | trace + 相关日志 | 所有用户都会以同样时序卡住 |
| 发布后是否存在性能或错误回归 | 有定义的 metrics + 对照样本 | 指标变化必然由当前改动单独造成 |

例如“点击 内置扩展 后页面卡顿”的命题至少要拆成：点击是否真的发出 IPC、Browser 是否完成 policy 决策、Renderer 是否收到回调、主线程是否被长任务占住、compositor 是否错过 BeginFrame。只跑 Extension 单测不能覆盖后四项；只看一张 trace 也不能证明改动没有影响其它站点。

这也是为什么排障产物应当带上版本、commit、平台、Profile/OTR、feature flags、复现步骤和样本条件。没有这些上下文的截图、控制台片段或“我这里没问题”，难以在另一台机器上重放。

## Chromium 的测试不是一条由快到慢的流水线

“测试金字塔”用于选择成本和覆盖范围，但不能把 Chromium 的测试硬压成一个目录层级。不同测试类型使用不同的进程模型、数据夹具和失败语义。

| 类型 | 常见源码/运行入口 | 最适合验证 | 常见误用 |
| --- | --- | --- | --- |
| unit test | `base/test/`、各组件 `*_unittest.cc` | 算法、状态机、序列约束、序列化、单个 service 的 contract | 用 fake 替代真实进程后，声称产品流程已通 |
| browser test | `content/public/test/content_browser_test.*`、Chrome `*_browsertest.cc` | Browser 启动、导航、权限、进程边界、WebContents 与真实 IPC | 以 test shell/fixture 的默认设置外推 Branding、policy 或真实分发配置 |
| Web test | `third_party/blink/web_tests/`、`content/web_test/` | Web platform 语义、Blink 渲染/脚本结果、回归输出 | 将像素或文本 expectation 当作所有 GPU/平台表现 |
| 性能 benchmark | `tools/perf/`、Telemetry / trace processor | 有明确 workload 和统计口径的时间、内存、渲染指标 | 将一次本地冷/热启动差异当成性能结论 |

`content/public/test/browser_test_base.*` 与 `content_browser_test.*` 显示 Browser 测试需要由测试框架控制 Browser 生命周期和环境；它不是普通 C++ `main()` 加一个断言。相应地，`content/web_test/` 中有 test shell、权限管理、tracing controller 等专门替身，说明 Web test 的可重复性来自受控环境。它很适合钉住 Web 可观察行为，却不等价于真实用户 Profile、企业策略或系统对话框。

选择测试时，先问失败是否应该在不启动浏览器时就暴露。若答案是“是”，优先小而确定的 unit test；若要求验证 Browser 和 Renderer 间的真实 Mojo、导航、document 销毁或权限取消，就把最小场景提升为 browser test；若更改的是 Web 兼容性或 Blink 输出，再看 Web test。不要为了“覆盖率”把所有逻辑塞入昂贵且易脆的 end-to-end 测试。

## 写测试时，锁的是边界而不是实现细节

好的 Chromium 测试会让未来重构仍有空间。它需要把用户可观察的 contract 和真正的边界条件写清楚，而不是断言某个私有 helper 恰好被调用三次。

对于一个 Browser Native capability，最小的测试矩阵往往比一条 happy path 更有价值：

| 维度 | 至少应覆盖的相反情况 |
| --- | --- |
| caller | 正确 Extension / 不受信 caller / 网页或 iframe |
| 身份 | normal Profile / OTR / 失效 document |
| 生命周期 | 正常完成 / navigation / Tab 关闭 / Renderer crash / Runtime 断连 |
| policy | allow / deny / dismiss / policy 禁用 |
| 数据 | 空结果 / 超时 / 重复回调 / 取消后迟到结果 |

这里的推理是直接的：如果 capability 的安全性依赖 caller、Profile 和 document 仍然有效，那么只测“被允许的 Extension 调到成功”无法证明那条边界存在。反过来，测试只说明这组输入在当前 build 下的结果，不能替代 macOS/Windows 签名、系统权限、网络或真实旧客户端升级验收。

对时序问题，避免用任意 `sleep` 让测试“稳定”。测试应等待一个可识别的状态：navigation commit、Mojo 回调、指定 frame、任务队列空闲或 explicit test hook。否则慢机器只会把偶然成功变成偶然失败，且掩盖真正的 race。

## Tracing：将跨进程“发生过”变成有时间轴的证据

Chromium 的 tracing 基础设施在 `base/trace_event/`，`base/trace_event/trace_config.*` 负责 trace 配置，`content/public/browser/tracing_controller.h` 与 `content/browser/tracing/tracing_controller_impl.*` 提供 Browser 侧控制入口；`services/tracing/public/cpp/perfetto/` 则是与 Perfetto 的连接层。它们共同支持把不同进程、线程与 category 的事件写到同一份可分析的 trace 中。

Trace 的价值不在于“录得越多越好”，而在于给一个明确问题选择足够的 category、时间窗口和相关标识。一次导航或 capability 请求至少应能在 Browser/Renderer 两侧用 request、frame 或 flow 关系关联起来；否则两段名字相近的 slice 并不能证明它们属于同一请求。

```text
用户动作 / request id
  -> Browser policy slice
  -> Mojo send / receive flow
  -> Renderer task / Blink work
  -> compositor or network follow-up
  -> 可见结果或明确失败
```

这张图是采集和阅读 trace 的目标，不代表每种功能都具备同名事件。若缺少能跨进程关联的 id，应优先补充低成本、受隐私约束的 trace point 或日志字段，而不是从时间上猜“两个相邻事件应该相关”。

Perfetto 能进一步对 trace 做结构化查询与指标计算。`base/tracing/test/` 中的 trace processor diff test 和 `run_perfetto_diff_tests.py` 表明：当团队把某个 trace-derived metric 当作长期 contract 时，应连同 trace 样本与查询结果一起测试，防止事件 schema 或 SQL 语义悄悄改变。它并不意味着每个局部问题都需要建一套 Perfetto 指标；一次性排障先保证 trace 可读、可复现即可。

## 日志、histogram 与 tracing 的分工

三者都能“看到运行时”，但面对的是不同问题。

| 工具 | 最适合记录 | 设计要求 | 不该承载 |
| --- | --- | --- | --- |
| 日志 | 罕见分支、错误码、调用上下文、排障开关 | 有稳定 request/session 标识；避免秘密、token、网页内容 | 大规模长期统计、每帧高频事件 |
| trace event | 时间、并发、线程、跨进程 flow、耗时分段 | category 克制；带可关联 id；可按窗口采集 | 无限制的用户内容或永久审计日志 |
| histogram / UMA-style metric | 可聚合的结果、错误类别、耗时分桶 | 名称、单位、枚举和隐私语义稳定；预先定义成功/失败分母 | 单个用户的调用链与原始诊断数据 |

`content/browser/metrics/histograms_monitor.*`、`histogram_synchronizer.*` 与 `histograms_internals_ui.*` 是 Browser 侧 histogram 观察和同步的静态入口；`services/tracing/public/cpp/perfetto/histogram_samples_data_source.*` 表明 histogram 样本也可以成为 tracing 的一部分。两者可关联，但语义仍不同：一个 sample 不会回答“这次请求在哪个线程阻塞”，一条 trace slice 也不能代替长期、可比较的分布。

新增指标前先写出问题和分母。例如“capability 成功率”应说明一次请求从哪一刻开始计数、cancel 是否属于失败、被 policy 拒绝是否与系统错误分桶、normal/OTR 是否混合。否则指标数字即使稳定，也无法支持发布决策。指标名一旦被看板和发布门禁消费，后续重命名或改变单位会制造静默断层。

## 性能定位：先固定 workload，再解释瓶颈

性能不是一个单一数字。首帧、导航、交互延迟、CPU、GPU、内存和功耗可能向相反方向变化。`tools/perf/` 及其依赖的 Telemetry、trace processor 入口，说明 Chromium 性能工作本身也依赖具体 browser target、story/workload、采样与结果处理，而不是运行一次 Chrome 就得出结论。

一个可复核的性能实验至少写明：

1. 目标二进制、GN args、commit、平台、驱动、feature flags 和干净/已有 Profile 状态；
2. workload 的起止条件，例如从用户点击到首个可交互状态，而不是“感觉页面出来了”；
3. 冷启动或热启动、网络/缓存、重复次数与异常样本处理方式；
4. 结果的统计口径和 trace、日志或 flame graph 等解释证据；
5. 预期收益与可能退化的维度，以及同基线对照。

当 trace 显示卡顿，不要立即把最长 slice 的函数当作根因。它可能是阻塞的结果而非原因，也可能只在一次 cache miss、慢磁盘或 debug build 中出现。先从用户可见的 deadline 往回追：主线程任务、IPC wait、网络 response、raster/GPU queue 或锁竞争；再用可重复 workload 验证假设。只有对照实验改变了怀疑因素且指标随之变化，因果判断才站得住。

## 从症状到根因的一条排障路径

以“新功能在一台 Windows 打包机中可构建，但安装后点击没有反应”为例，最短路径不是把所有日志开到最大：

1. **冻结现象。** 记录安装包 hash、版本、Distribution Profile/lock、Windows 版本、首次安装还是覆盖安装、具体点击步骤与预期可见结果。
2. **确定所有者。** UI/Extension 是否收到点击；若是 Browser Native capability，再确认 Browser 是否注册并接受 caller；不要把构建成功误读为运行时 contract 已打通。
3. **建立一次关联。** 用 request id 或等价关联字段贯穿 UI、Extension、Browser、Runtime 回调；必要时在受控 build 录制窄窗口 trace。
4. **查看边界结果。** 分别确认 caller 鉴权、Profile/OTR、navigation/Tab 生命周期、Mojo reply、错误码与 UI 状态。每一跳都记录“已到达 / 未到达 / 被拒绝 / 等待中”。
5. **选择最小回归测试。** 让复现路径先在合适的 unit、browser 或 Web test 中稳定失败，再修复并覆盖取消/拒绝等相邻边界。
6. **回到制品验收。** 重新构建、签名/安装、在目标 Windows 上按同一脚本复测；若涉及更新链，再用真实旧客户端完成升级验收。

这条流程故意把“源码修复”和“发行可用”分开。前者可以由测试和 trace 证明；后者还受 package、签名、安装、policy 与真实环境影响。混为一谈，既会让工程师过早停止，也会让排障记录失去复用价值。

## 本文已核验的源码锚点

| 主题 | 源码入口 |
| --- | --- |
| Browser 测试框架 | `content/public/test/browser_test_base.*`、`content/public/test/content_browser_test.*`、`content/public/test/test_launcher.*` |
| Web test 受控环境 | `content/web_test/`、`content/web_test/browser/web_test_browser_main_runner.*`、`web_test_permission_manager.*`、`web_test_tracing_controller.*` |
| Trace 配置与 Browser 控制 | `base/trace_event/trace_config.*`、`base/trace_event/trace_log.*`、`content/public/browser/tracing_controller.h`、`content/browser/tracing/tracing_controller_impl.*` |
| Perfetto 接合与 trace 指标测试 | `services/tracing/public/cpp/perfetto/`、`base/tracing/test/run_perfetto_diff_tests.py`、`base/tracing/test/trace_processor/` |
| 指标与 histogram | `content/browser/metrics/histograms_monitor.*`、`histogram_synchronizer.*`、`histograms_internals_ui.*`、`services/tracing/public/cpp/perfetto/histogram_samples_data_source.*` |
| 性能 workload 与结果处理 | `tools/perf/`、`tools/perf/chrome_telemetry_build/`、`tools/perf/crossbench_result_converter.py` |

## 运行时验证路径

- 为每个新增 Browser Native capability 建立 allow、deny、OTR、iframe、navigation、Tab 关闭、Renderer crash 与 Runtime 断连的最小测试矩阵；明确哪些只能在真实产品中验收。
- 为性能敏感 patch 固定 benchmark workload、冷/热缓存、设备与重复次数，并保留 baseline 对照和 trace 解释；不要以一次开发机结果决定发布。
- 按平台分别执行 signed package 的安装、启动、核心能力和旧客户端升级验收。未完成前，不能把 unit/browser test 通过表述为可发布。

## 证据设计：先写“失败时我要看到什么”

跨进程功能最怕测试只覆盖成功返回。设计 capability 时就应为 request start、Browser allow/deny、service dispatch、reply、cancel/disconnect 和用户可见结果定义可关联事件，并控制数据最小化。这样真实故障发生时，可以用 request/frame identity 拼接时间轴，而不必临时增加可能泄露 URL、prompt 或用户数据的全量日志。

性能证据还要满足可比较性：同一 metric、同一进程、同一 workload、同一采样窗口、同类机器和足够重复次数。RSS 与 Physical Footprint、冷启动与已有 Profile、debug 与 official build 不能直接计算改进百分比。若条件不同，应明确写“不可直接比较”，再用 trace 解释观察到的差异。

## 测试层级应跟着 owner 走

选择测试类型时，先问失败 contract 属于谁。纯数据结构、状态机或 helper 适合 unit test；需要真实 BrowserContext、WebContents 或 service binding 的行为适合 browser test；跨进程、真实页面生命周期和产品 UI 则需要更高层 integration/E2E。测试越高层覆盖越完整，但速度、稳定性和定位精度也越差。

| 要证明的事实 | 首选测试 | 还应补什么 |
| --- | --- | --- |
| 状态转换、参数校验、取消规则 | unit test | owner 销毁与边界输入 |
| Browser service/Profile 行为 | browser test | 多 Profile、OTR、policy |
| Mojo 断连与 child process 生命周期 | multiprocess/browser test | crash、restart、late reply |
| 页面与 Extension 行为 | web/extension integration | navigation、worker restart、跨 origin |
| Distribution 更新与真实用户结果 | native package/old-client E2E | 渠道、回退、平台差异 |

不要为了“更真实”把所有断言都放进 E2E。底层 contract 若只能通过一次完整安装包测试观察，失败时很难区分 Browser、Extension、Runtime 还是发布链；更好的组合是底层 deterministic test 锁住规则，高层少量用例证明各层真的接通。

## Trace 之前先设计事件语义

Trace category 和 event name 只是容器。要让跨进程时间线可读，事件还需要稳定 identity：navigation id、frame/document token、request/session id、process/thread/sequence、阶段和结果。没有 identity 的 `Start/Done` 在并发请求下无法配对，最后只能凭时间邻近猜因果。

建议为一次关键链路定义最小事件集合：accepted、dispatched、remote started、remote completed、reply validated、committed/cancelled。duration event 适合一个 owner 内的连续工作；async/flow event 适合跨线程或跨进程；counter 适合队列、内存和并发数。不要用一个超长 duration 跨越未知异步等待，这会把等待归因给错误线程。

Trace payload 还受隐私和体积约束。URL、页面文本、Agent prompt、用户文件名等不能为了排障直接写入；优先记录脱敏 category、枚举、长度、hash 或内部 request id，并为 verbose category 设置受控开启范围。

## 性能比较必须先证明可比

“优化后快了 20%”只有在指标、进程范围、workload、设备、build、Profile、采样窗口和统计方法一致时才成立。Chromium 多进程还会共享内存页，RSS、Physical Footprint、JS heap 和 allocator committed bytes 表达不同事实，不能混用成一个“内存”。

性能实验应记录 warm/cold、首次/稳态、前后台、网络和缓存状态，并至少多轮采样。平均值可能掩盖长尾，单次峰值也可能来自 update、GC 或系统噪声；根据用户体验选择 median、p95、最大值、时间积分或失败率，而不是先看哪一个数字更漂亮。

若前后环境不匹配，应分别报告绝对观察值并标注不可直接比较。不能用 Debug 对 Release、空 Profile 对真实 Profile、不同 Chromium major 或不同 Extension/Runtime 版本计算提升百分比。

## 从开发现场到线上证据的距离

Debugger 和本地 trace 能解释一次现场，却无法说明用户群中的发生率。Histogram、crash report 和受控 telemetry 可以补充规模，但它们同样需要版本、平台、channel、process type 和 feature cohort，且必须遵守隐私边界。

Crash dump 只有匹配 binary/build id 的 symbols 才能形成可靠 stack；stack 聚合之后还要区分同一根因、二次崩溃与噪声。修复合入后，应观察目标版本真实客户端的 crash/oom/恢复指标，而不是只把 issue 状态改为 fixed。

## 给一次跨进程改动设计证据包

以“Extension 请求由 Browser 转发 Runtime”为例，可以建立五层证据：

1. unit test 锁住 caller、document、deadline 和错误映射；
2. browser test 注入 Runtime fake，覆盖导航、disconnect、late reply；
3. trace 用同一 request id 串起 Extension、Browser 与 Runtime；
4. Distribution E2E 使用版本锁定的真实 Extension/Runtime，验证安装包行为；
5. 旧客户端升级验收证明 channel 激活、兼容与回退。

若其中第三层失败，可以定位运行时链路；第五层失败，则不能用前四层成功宣称发布完成。这种分层让团队既能快速迭代，又不会把局部证据升级成产品结论。

## 测试必须先证明能失败

一个新增测试若在回退修复代码后仍通过，通常没有锁住目标 contract。提交前可以暂时制造旧行为、切断 fake service、让 reply 晚于导航或修改期望值，确认测试按预期失败，再恢复实现。这个“反证”比覆盖率数字更能说明测试有效。

对 timeout/retry 测试，应使用可控 fake clock、barrier 或明确事件，不依赖真实 sleep；对跨进程 crash，使用测试框架提供的 process control 和退出观察；对性能 benchmark，固定数据与 workload，并把 warmup 与测量阶段分开。测试只有观察到真实完成条件才能减少 flaky，加长等待只是延后失败。

## Flaky test 也需要根因分类

偶发失败可能来自真实竞态、测试共享 Profile/端口/全局状态、未等待完成条件、平台资源不足或外部网络。第一步应保存失败种子、日志、trace、进程退出和环境，而不是立刻重跑到绿色。重试可以用于统计发生率，不能作为长期隐藏失败的默认修复。

若测试只在高并发 CI 失败，应比较 task 调度、timeout、资源和 test isolation；若本地打开 debugger 后消失，优先怀疑时序。最终要么修复产品竞态，要么让测试使用可控同步与独立资源，不能简单扩大 timeout 后宣称稳定。

隔离后的 flaky 用例仍需 owner 和退出条件，不能无限期 quarantine。

## 工程结论

有效的证据链要求每一步回答一个明确事实，并写清不能证明什么。测试守住 contract，trace 解释时序，metric 观察群体，真实客户端验收确认交付；四者组合才支撑发布判断，工具数量本身没有证明力。

## 继续阅读

- [11-Media、WebRTC、设备与平台能力：从 Web 请求到一帧真实音视频](/blog/2ecb008f26f6fca6): 相邻章节的前置机制。

## 上游源码入口

文中的相对源码路径可从 [Chromium 官方上游快照](https://chromium.googlesource.com/chromium/src/+/b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b/) 定位。此入口保留原稿的上游阅读坐标，不包含任何产品定制代码，也不替代运行时验收。
