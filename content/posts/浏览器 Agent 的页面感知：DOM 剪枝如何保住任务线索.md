---
id: c8df4c21c5cb172a
title: 浏览器 Agent 的页面感知：DOM 剪枝如何保住任务线索
date: '2026-11-05'
updatedAt: '2026-11-07'
description: >-
  以 browser-use 和 agent-browser 的源码为例，拆解页面采集、可见性判断、交互目标识别、结构压缩与动态回读，给出可实施的 DOM
  剪枝策略和验收指标。
topic: architecture
tags:
  - Browser Agent
  - DOM 剪枝
  - Accessibility Tree
  - browser-use
  - agent-browser
  - CDP
cover: /media/c8df4c21c5cb172a-29fdca73f4a936b5.webp
---
在研究[只用 Accessibility Tree，浏览器 Agent 能走多远？](/blog/98c0567121f59475)时，我碰到一个比“选哪棵树”更实际的问题：一个页面可能有大量导航、广告、隐藏面板、重复卡片和框架控件。把原始 DOM 全量交给模型，目标会淹没在结构里；只留下按钮，又可能看不到按钮所属的订单、日期和结果。页面感知要解决的不是“删掉多少节点”，而是**在有限上下文中保住做下一步决策与验收所需的证据**。

![浏览器页面从繁杂节点收束为少量任务线索的封面](/media/c8df4c21c5cb172a-29fdca73f4a936b5.webp)

## 一句话总结

**DOM 剪枝应发生在模型观察层：先取得可核对的页面状态，再按任务保留可操作目标、说明目标的上下文和结果证据；观察不足时扩大范围，动作之后重新观察。** `browser-use` 采用 DOM、布局与 AX 信息融合后序列化的路线；`agent-browser` 的 Chrome 原生路径主要从 AX Tree 生成可裁剪快照。两者都不能用“交互节点越少越好”概括。[browser-use DOM 服务](https://github.com/browser-use/browser-use/blob/main/browser_use/dom/service.py)、[agent-browser Snapshots 文档](https://agent-browser.dev/snapshots)

本文分析的是截至 2026 年 11 月 5 日可查的上游实现与文档。开源项目会迭代；文中的代码片段是说明设计边界的伪代码，不是从任一仓库复制的可运行 API。

## 先分清三种“树”和两次裁剪

DOM 表示文档节点及其关系。Accessibility Tree（下称 AX Tree）由浏览器依据原生 HTML、ARIA 和当前状态生成，强调角色、名称、值和关系。布局与截图则回答元素在哪里、是否被遮挡、视觉上是什么样。它们提供不同证据，同一目标在三者中的表示不一定一一对应。[Chromium Accessibility Tree](https://developer.chrome.com/blog/what-is-the-accessibility-tree)、[Chrome DevTools Protocol Accessibility 域](https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/)

| 层次 | 常见操作 | 直接影响 |
| --- | --- | --- |
| 采集 | 从浏览器读取 DOM、AX、布局、frame、可见性 | 可供判断的原始证据范围和采集开销 |
| 观察构建 | 合并节点身份、过滤无关分支、保留祖先、生成 ref | Agent 能否定位与消歧 |
| 模型输出 | 将观察压缩为文本、局部范围或差量 | token、阅读负担与信息缺口 |

“DOM 剪枝”通常指后两层生成**送给模型的页面表示**，不是删除网页的真实 DOM 节点。真实 DOM 仍供页面运行，也供工具执行动作。采集到完整 DOM 后再过滤文本，能减少模型输入，却未必减少浏览器与工具之间的数据传输；要降低采集成本，需要另行测量采集阶段并选择局部读取或增量机制。[browser-use 的采集调用](https://github.com/browser-use/browser-use/blob/main/browser_use/dom/service.py)、[agent-browser 原生快照实现](https://github.com/vercel-labs/agent-browser/blob/main/cli/src/native/snapshot.rs)

## browser-use：先合并证据，再产出简化树

当前 `browser-use` 的 DOM 服务通过 CDP 读取 `DOMSnapshot.captureSnapshot`、`DOM.getDocument` 和各 frame 的 AX 信息。DOMSnapshot 提供布局、计算样式等数据；DOM 树提供节点关系；AX 补充角色、名称与状态。源码把这些结果合并为增强节点，再由 serializer 生成给 Agent 使用的简化表示。这说明它不是“直接把 HTML 清理一下”，也不是“仅导出 AX Tree”。[DOM 服务采集部分](https://github.com/browser-use/browser-use/blob/main/browser_use/dom/service.py)、[Enhanced Snapshot 解析](https://github.com/browser-use/browser-use/blob/main/browser_use/dom/enhanced_snapshot.py)

其剪枝值得注意的地方有四处。

第一，**可见性不是一个布尔属性**。实现会检查样式、布局边界和父 frame，并以 viewport threshold 控制视口附近的范围。默认阈值在当前源码中是 `1000` 像素；这是一项实现参数，不能解读成所有任务都应该预读 1000 像素。超出视口与被 CSS 隐藏也要区分：前者可能通过滚动到达，后者可能需要先打开菜单或切换状态。[可见性与 viewport threshold](https://github.com/browser-use/browser-use/blob/main/browser_use/dom/service.py)

第二，**交互性是多信号判断**。`ClickableElementDetector` 不只认 `button`、`input` 和 `a`，还检查 AX 属性与角色、显式属性、JS click listener、部分组件包装节点及 `cursor: pointer`。这扩大了非语义化网页的覆盖面，也会引入误判：指针样式或某个类名只能提示“可能可操作”，不能证明点击一定有业务效果。[交互元素检测源码](https://github.com/browser-use/browser-use/blob/main/browser_use/dom/serializer/clickable_elements.py)

第三，**删除空壳要保留路径**。serializer 先建立简化树，保留可见、可滚动、含有效子节点或 Shadow DOM 内容的结构；再优化分支，为可见交互目标分配索引。若把所有非交互祖先直接删掉，“删除”按钮就可能失去“订单 A”这一层上下文。对选择动作而言，祖先有时比同级的更多按钮更重要。[DOMTreeSerializer 源码](https://github.com/browser-use/browser-use/blob/main/browser_use/dom/serializer/serializer.py)

第四，**frame 和 Shadow DOM 是边界，不是噪声**。源码显式处理 Shadow root、iframe 的坐标与递归深度。忽略这些边界，模型看似找到了控件，执行时却无法判断它属于哪个 frame；反过来，无限制展开所有 frame 也会扩大成本与歧义。应保留 frame 身份及必要的局部路径，在具体任务需要时深入。[DOM 服务 frame 处理](https://github.com/browser-use/browser-use/blob/main/browser_use/dom/service.py)

## agent-browser：从 AX 快照裁剪模型观察

`agent-browser` 的当前 Chrome 原生路径通过 CDP `Accessibility.getFullAXTree` 读取 AX 节点、构树并生成 ref。它提供几种彼此独立的输出控制：`snapshot -i` 只看交互项，`-c` 压缩空结构，`-d` 限深，`-s` 按 CSS selector 缩小范围。`-s` 需要借助 DOM 子树与 AX 节点的底层节点 ID 对应，所以“AX 快照”也不意味着整条实现链完全不碰 DOM。[原生快照源码](https://github.com/vercel-labs/agent-browser/blob/main/cli/src/native/snapshot.rs)、[Snapshots 文档](https://agent-browser.dev/snapshots)

这些选项解决不同问题，不能机械叠加为默认配置：

| 选项 | 适合的提问 | 容易丢失的线索 |
| --- | --- | --- |
| 完整 snapshot | 页面有哪些区域、提示、结果和控件？ | 输入较长，重复内容可能抢占注意力 |
| `-i` | 当前有哪些可操作目标？ | 标题、行内容、状态文字等非交互证据 |
| `-c` | 能否去掉没有信息的结构层？ | 对布局分组的部分直觉，需核对压缩规则 |
| `-d` | 能否先看页面上层轮廓？ | 深层表单、弹窗和列表项 |
| `-s` | 已知目标区域，能否只看该区域？ | 区域外的错误提示、确认状态或遮挡物 |

官方文档明确说，compact snapshot 保留可见文字、状态文字及其直接祖先，移除空的兄弟分支；interactive snapshot 则过滤非交互内容。因此若任务是“查某航班是否延误”，只读 `-i` 可能保住搜索控件，却丢掉结果表格里的状态；若任务是“点击第 3 笔订单的退款”，压缩掉订单行的标题与编号则可能误点同名按钮。[Snapshots 过滤说明](https://agent-browser.dev/snapshots)

ref 也有生命周期。文档说明：存活的 DOM 节点可跨同文档快照保留 ref，节点替换或导航会使它失效；虚拟 AX 节点的 ref 只在当前快照有效。操作后应重新观察，导航后尤其如此。重复 role/name 的恢复匹配存在歧义时，工具会失败而非猜测。[Snapshots ref 生命周期](https://agent-browser.dev/snapshots)

需要区分版本：此前[AX-only 文章](/blog/98c0567121f59475)检查的 `agent-browser 0.19.0` 经 Playwright `ariaSnapshot()` 生成语义快照；本文讨论的当前 Chrome 原生路径直接读取 CDP AX Tree。相同命令名不能代替依赖版本与调用链核验。

## 一套可实施的剪枝顺序

我会把观察设计成“先给足以决定下一步的局部证据，失败时逐级扩展”，而不是从全量 HTML 一步压成按钮清单。

### 1. 定义本轮任务与证据槽

先将用户目标拆成三类信息：**动作目标**（输入框、按钮、链接）、**消歧上下文**（行标题、卡片名称、所属区域、frame）和**完成证据**（结果文本、状态、导航位置、错误提示）。这三类不一定都来自可交互节点。

例如“为订单 123 申请退款”需要“退款”按钮，也需要订单号 123 对应的行；申请之后还要读到请求已提交或失败的状态。只保留 `[button] 退款` 会把最关键的业务身份剪掉。

### 2. 先做确定性的粗过滤

移除脚本、样式、装饰性 SVG 子节点、不可见且当前不可达的分支，以及重复的空包装层；保留可见文字、状态提示、表单当前值和可滚动容器。隐藏上传控件、验证提示、展开后才出现的菜单等要按页面行为处理，不能套“不可见即删除”。`browser-use` 的 serializer 就为隐藏 file input 和校验属性设置了例外，说明过滤器需要接受现实网页的非规范写法。[serializer 简化规则](https://github.com/browser-use/browser-use/blob/main/browser_use/dom/serializer/serializer.py)

### 3. 为目标保留最小的语义路径

从候选目标向上保留能消歧的标题、行、表单分组和 frame；向下保留名称、值、状态及与目标直接相关的文本。多个相同按钮时，扩大到各自的最近业务容器，而不是用第几个按钮代替业务身份。动态列表应核对稳定业务键；位置索引只在当前观察中有效。

下面的伪代码说明选择逻辑，`requiredEvidence` 是由任务定义的证据槽，不是模型凭空生成的页面事实：

```text
capture page state: DOM + AX + layout signals (as available)
normalize nodes by frame and backend identity
drop definite noise; retain reachable and exceptional nodes
find candidate actions and requiredEvidence
for each candidate:
    keep role, name, value, state
    keep nearest ancestor that distinguishes it from siblings
    keep result/status region needed to verify the task
serialize with refs and page-state identity
if target or evidence is missing/ambiguous:
    expand region or switch observation mode; do not guess
after action:
    observe again and check the postcondition
```

这段流程的关键不在某个过滤表达式，而在**可恢复性**：模型必须知道“没有看到”可能来自页面不存在、当前未展开、视口外、frame 未读取或被过滤。输出若只给空列表，就把这些情况合并成了一个无法诊断的结果。

### 4. 输出预算按问题分配

页面概览、局部操作和结果验收不必共用一份同样大小的快照。初次观察保留区域标题与主要动作；找到目标后按区域读取；执行后重点读取结果、错误和状态变化。当前页确实有大量同质卡片时，可先保留数量、前后少量示例与检索入口，再按用户指定条件展开目标卡片。这是本文建议的策略，不是声称两个项目已按同样方式实现“任务相关性排序”。

### 5. 每次动作都处理观察过期

观察和执行之间可能发生重排、弹窗、路由切换或虚拟列表回收。执行器应确认 ref 指向的节点仍存在，必要时重新核对 role/name、frame 和业务容器；匹配多个候选就停止并重新观察。点击调用成功仅证明动作被发出，不证明用户任务完成。[agent-browser ref 规则](https://agent-browser.dev/snapshots)、[Playwright Actionability](https://playwright.dev/docs/actionability)

## 剪枝如何验收：同时测体积与信息损失

“快照少了 70% token”如果没有对应任务成功率与漏检率，只能说明文本变短。建议在同一批页面状态上保存原始观察、剪枝观察、目标动作和完成条件，至少比较：

| 指标 | 具体问题 |
| --- | --- |
| 候选召回 | 正确动作目标是否仍在观察里？ |
| 消歧充分性 | 同名按钮是否仍能按订单、日期或区域区分？ |
| 结果可见性 | 成功、失败、校验错误是否仍能读到？ |
| 误选与受阻 | 模型是否选错目标；信息不足时是否明确停止？ |
| 输入体积 | 每轮送入模型的 token 与原始快照相比减少多少？ |
| 时延与成本 | 分开测采集、序列化、模型和页面等待时间；重试也计入任务总成本 |

测试集要包含静态表单、重复列表、隐藏菜单、滚动区域、Shadow DOM、iframe、虚拟列表、无语义图标以及动作后的错误提示。对每个任务，先用足量观察建立“应保留哪些证据”的标注，再比较不同剪枝策略。本文没有在同一任务集上跑 `browser-use` 与 `agent-browser` 的基准测试，因此不宣称谁更快或成功率更高。

还有一个安全边界：页面文字可能包含针对 Agent 的指令。剪枝不能把网页内容升格为用户命令；应保留内容来源和区域身份，执行敏感操作时仍按用户授权与动作策略判断。压缩文本若抹掉来源，反而让模型更难区分“页面显示的提示”和“应该遵循的任务”。

## 我的判断框架

**值得先上**：以 AX 或 DOM 的可交互目标作为入口，保留最近业务容器、状态文字和动作后的回读；这是在复杂页面上减少输入而不丢任务线索的起点。

**可以再等**：全站通用的模型驱动“智能删节点”、按固定比例裁剪、无条件差量快照。没有带标注的任务集和恢复策略，压缩率不能证明质量。

**重点关注**：采集成本与模型输入成本要分别测；同名目标的业务身份、frame/Shadow DOM 边界、视口外可达内容，以及操作后新的结果证据，决定剪枝能否用于真实任务。页面感知的最佳实践不是找到一棵最短的树，而是让 Agent 在每一步都能知道自己看到了什么、可能漏了什么、下一步如何补证。

## 参考实现与文档

- [browser-use：DOM 服务与 CDP 采集](https://github.com/browser-use/browser-use/blob/main/browser_use/dom/service.py)
- [browser-use：DOM serializer](https://github.com/browser-use/browser-use/blob/main/browser_use/dom/serializer/serializer.py)
- [browser-use：交互目标检测](https://github.com/browser-use/browser-use/blob/main/browser_use/dom/serializer/clickable_elements.py)
- [agent-browser：Chrome 原生 snapshot 实现](https://github.com/vercel-labs/agent-browser/blob/main/cli/src/native/snapshot.rs)
- [agent-browser：Snapshots 使用说明](https://agent-browser.dev/snapshots)
- [Chrome DevTools Protocol：Accessibility 域](https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/)
