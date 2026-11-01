---
id: "b33b3b84e02f9811"
title: "18-Accessibility、国际化与平台语义：浏览器如何把“可用”交给真实的人"
description: "从源码阅读入口、进程边界与验证条件理解Accessibility、国际化与平台语义：浏览器如何把“可用”交给真实的人。"
date: null
topic: "principles"
tags: []
collection: "docs"
cover: "/media/b33b3b84e02f9811-8482bcb56ed47f43.webp"
---

从源码阅读入口、进程边界与验证条件理解Accessibility、国际化与平台语义：浏览器如何把“可用”交给真实的人。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

![Chromium Accessibility、国际化与平台语义封面](/media/b33b3b84e02f9811-8482bcb56ed47f43.webp)

> 阅读坐标沿用原稿：Chromium `153.0.8010.37`，上游 commit `b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b`。本次同步未重新进行源码与目标平台运行时验收。

![从页面语义到平台辅助技术与本地化资源](/media/b33b3b84e02f9811-4b78216a5dc57f77.webp)

## 一句话结论

“页面能显示”不是可用性的终点：DOM/Views 语义要形成正确 AX tree，再适配平台辅助技术；文本还要经过资源、locale、排版、输入法和字体链路，最终只能由真实用户路径验证。

可访问性不是在 UI 最后加几个 `aria-label`，国际化也不是把字符串抽成资源文件。对浏览器而言，它们都要求把内部状态以**稳定、可理解、可操作、符合本机平台习惯**的语义传给用户和辅助技术。视觉上能点击的控件，如果没有可访问 name、role、state、focus 和 action，就不等于可用；中文翻译正确，也不等于日期、排序、截断、快捷键、输入法和屏幕阅读器语义正确。

这一章的阅读主线是：网页 DOM、Browser UI 和平台系统各自如何形成 accessibility tree，如何将变化事件交给 assistive technology，以及 locale/resource 如何进入最终 UI。它们在 UI 表面相遇，却是两套独立、需要同时验证的系统。

## Accessibility tree：不是 DOM 的另一份序列化

Blink 的 `AXObject`、`AXObjectCacheImpl` 与 `BlinkAXTreeSource` 负责从 DOM、layout、ARIA、焦点、选择和可见性等信息构建 Renderer 可访问语义；`ui/accessibility/ax_tree.*`、`AXNodeData` 和 serializer/update 模型承载树及其增量。树的节点需要表达 role、name、description、value、state、location、关系和可执行 action，而不是只复制 HTML tag 与文本。

```text
DOM + ARIA + layout + focus/selection + visibility
  -> Blink AXObject / AXObjectCache
     -> AXTree update across process boundary
        -> Browser/UI AX tree and platform node delegate
           -> macOS / Windows / Linux assistive technology
```

因此下列概念必须分开：

| 概念 | 回答的问题 | 不能推出 |
| --- | --- | --- |
| DOM node | 页面作者写了什么结构 | 屏幕阅读器会如何朗读或能否操作 |
| AX node | 用户辅助技术能感知的语义节点 | 它在任何平台都有相同 API/朗读顺序 |
| role/name/state | 这是何种控件、叫什么、现在什么状态 | 视觉布局、业务权限或操作一定成功 |
| AX event/update | 哪些语义变化应通知辅助技术 | 所有动态变化都应高频完整广播 |

一个隐藏元素可能不在 tree 中；一个 DOM 容器可能被扁平化；一个虚拟列表可只暴露当前可访问范围；iframe、popup、PDF viewer、WebUI 与 Browser Views 都可能拥有独立或拼接后的树。调试时不能拿 DOM inspector 的截图替代 AX tree 证据。

## name、role、state 与 focus：最低交互契约

真正可操作的 UI 至少要让辅助技术回答四件事：这是什么、叫什么、当前状态、可做什么。按钮、输入框、tab、dialog、菜单、进度、错误提示和 live region 的语义不能依赖颜色、图标位置或鼠标 hover 才可获得。

| UI 问题 | 视觉实现常见误判 | 应验证的可访问语义 |
| --- | --- | --- |
| 图标按钮 | “有 tooltip 就够了” | 可访问 name、role、enabled/pressed/expanded state、keyboard action |
| 异步状态 | “spinner 在转，用户会看到” | busy/progress、状态变化、合适的 live announcement、取消入口 |
| 弹窗/确认框 | “遮罩挡住背景了” | focus 移入、focus trap/restore、dialog name/description、ESC/关闭行为 |
| 表单错误 | “字段变红了” | error text 关联、invalid state、可定位的修复提示 |
| 虚拟列表 | “DOM 只渲染可见项所以没问题” | item position/count、focus 移动、滚动后树更新与朗读一致 |

焦点尤其是跨层交互的真实边界。Extension popup、WebUI、browser dialog、系统 file picker 与网页 iframe 之间发生切换时，应定义 focus 谁获得、何时回退、Tab/Shift+Tab/ESC 如何工作。仅以视觉层级或 z-index 设计交互，容易在键盘和辅助技术场景形成“看得见但到不了”的死角。

## Platform adapter：同一个 AX tree 不等于相同的系统体验

`ui/accessibility/platform/` 与 Views 的 `view_ax_platform_node_delegate_{mac,win,auralinux}.*` 将 Chromium 的通用 AX 表示映射到不同系统的辅助功能 API。它们的存在本身说明 macOS、Windows 与 Linux 并不是同一个“屏幕阅读器平台”：每个平台的 role、action、text range、focus 通知、窗口层级、system caret 与事件时机都有差异。

| 层次 | 应保持一致 | 平台必须单独验证 |
| --- | --- | --- |
| Web / ARIA 语义 | role/name/state/action 的基本含义 | 浏览器/辅助技术对边缘 ARIA 的支持与朗读 |
| Chromium AX tree | 节点、关系、增量更新与事件意图 | tree 拼接、性能、跨窗口/进程的可观察表现 |
| 平台 adapter | 将语义提供给系统 API | VoiceOver、Windows Narrator/IA2/UIA、Linux AT 的 action、焦点、文本范围 |
| 产品 UI | 关键操作可以不依赖鼠标完成 | 原生 dialog、输入法、系统快捷键、无障碍设置影响 |

不要把 macOS 的 VoiceOver 走通外推为 Windows 也正确，也不要只测 Chromium web test 就宣布 Browser UI 无障碍。尤其是有 Browser Native capability、权限确认、媒体/文件选择、下载与更新提示的产品，最终 action 常穿过系统 dialog；这部分必须真机验收。

## 国际化：资源、locale 与排版是同一条交付链

`ui/base/l10n/l10n_util.*` 提供本地化字符串工具，`ui/base/resource/resource_bundle.*` 管理资源加载；`.grd`/`.grdp` 等资源定义与构建产物共同决定某个 locale 下可以取到什么文本、图片或数据。它们不是运行时从网络拉一份翻译那么简单：遗漏资源、错误 id、fallback、格式化参数或未随 native bundle 打包，都可能让某个平台在启动或某个罕见路径才失败。

国际化至少要同时验证四个面：

1. **文本语义。** 翻译是否保留动作对象、错误原因、隐私和权限含义；不要把技术错误码硬译成无法排障的文案。
2. **格式化。** 日期、时区、数字、货币、复数、单位、排序和大小写是否使用 locale-aware 工具，而不是手拼字符串。
3. **排版与输入。** 长文本、CJK、RTL、字体 fallback、缩放、输入法组合态、快捷键冲突与截断是否正确。
4. **可访问输出。** visible label、accessible name、tooltip、error/live region 是否都同步翻译，且 placeholder 不替代 label。

```text
message/resource definitions
  -> build-time resource packaging
     -> ResourceBundle + locale selection
        -> UI formatting/layout/input/fallback fonts
           -> visible text + accessible name/description
```

这也解释了为什么“英文界面没问题”不是国际化验收。英文短词可能掩盖中文长文本截断，LTR 可能掩盖 RTL 顺序，物理键盘快捷键可能掩盖输入法 composition，视觉字符串存在可能掩盖 AX name 仍是旧 locale。

## 建议的追踪任务：验证一个动态 内置扩展 面板是否真正可用

1. 用键盘从网页、浏览器工具栏进入面板，检查 focus order、焦点样式、ESC 关闭和关闭后焦点恢复。
2. 用系统屏幕阅读器检查面板的 name/role、每个 action 的 label/state、loading/error/success 的 live announcement；不要只看 DevTools DOM。
3. 在 loading 中导航、关闭 Tab、断开 Runtime 或拒绝 Browser permission，确认 stale result 不会宣布给新 document，且 busy/focus 状态被清理。
4. 用中文、英文、长文本/缩放、至少一项输入法组合输入复测；检查 visible 文案与 accessible name/description 一致。
5. 在 macOS 和 Windows 的 signed Distribution 真机上分别复测，记录辅助技术、系统版本和结果；单一平台成功不能外推。

## 本文已核验的源码锚点

| 主题 | 源码入口 |
| --- | --- |
| Blink AX tree | `third_party/blink/renderer/modules/accessibility/ax_object.*`、`ax_object_cache_impl.*`、`blink_ax_tree_source.*` |
| 通用 AX tree/增量 | `ui/accessibility/ax_tree.*`、`ax_node.*`、`ax_node_data.*`、`ax_tree_serializer.*`、`ax_tree_update.*` |
| Browser/Views 与平台 adapter | `ui/views/accessibility/view_accessibility.*`、`ax_tree_source_views.*`、`ui/accessibility/platform/ax_platform_node_*`、`view_ax_platform_node_delegate_*` |
| accessibility 测试/调试 | Blink accessibility testing、`content/renderer/accessibility/`、`content/public/test/accessibility_notification_waiter.*`、Inspector Accessibility agent |
| 本地化与资源 | `ui/base/l10n/l10n_util.*`、`ui/base/resource/resource_bundle.*`、资源 `.grd`/`.grdp` 与 `ui/strings/` |

## 运行时验证路径

- 用 macOS VoiceOver 与 Windows Narrator/相应辅助技术分别验证 Browser UI、WebUI、Extension popup、PDF/print preview、权限与更新 dialog 的 name/role/state/focus/action。
- 对正常、加载、错误、取消、navigation、Tab close、OTR、Runtime disconnect 路径采集 AX tree/event，确认无 stale announcement、焦点遗失或不可达动作。
- 覆盖中文/英文、长文本、RTL、缩放、字体 fallback、输入法组合输入、日期数字格式与 keyboard shortcut；同时检查可见文案和 AX 文案。
- 在每个目标 Distribution 的 native package 中确认 locale/resource 都被正确打包和加载；开发机资源路径或 Web test 成功不能替代签名包验收。

## 验收推演：视觉上正确的 AI 面板为何仍不可用

流式答案可能每个 token 都触发 live region announcement，导致读屏器无法操作；自定义按钮只有图标没有 accessible name；焦点在面板关闭后没有回到触发点；加载、失败、取消和完成状态只用颜色表达；键盘用户无法进入或退出结果列表。截图看不出这些问题，DOM 结构也不能替代平台 accessibility event。

本地化同样不仅是翻译字符串。长中文/英文、RTL、字体 fallback、日期数字格式、输入法组合态和系统缩放都会改变布局与交互；资源没有进入最终 pak 时，源码中翻译完整也没有意义。应在目标 Distribution package 中用真实辅助技术、locale 与输入设备完成任务式验收。

## AX tree 是渲染语义的另一条输出链

DOM 提供文档结构，layout/paint 提供视觉结果，Accessibility tree 则将可交互语义组织成平台辅助技术可以消费的对象。它会合并、忽略或重构部分 DOM 节点；CSS、ARIA、原生控件状态和 Browser UI 都会影响最终 tree。

因此“DOM 上有文本”不保证屏幕阅读器能获得正确 name，“按钮看起来禁用”也不保证 AX state 是 disabled。调试时应查看最终 AX tree、platform node 和事件，而不是只读 HTML attribute。

## 动态 UI 需要稳定的 name、role、state 与关系

AI 面板、流式回答、toast、dialog 和自动执行状态会频繁更新。每次 DOM patch 如果替换整个 subtree，可能导致焦点丢失、屏幕阅读器重复朗读或虚拟光标重置。更稳妥的设计是保持关键控件 identity，精确更新 state/value，并谨慎使用 live region。

Dialog 打开时要管理 initial focus、focus trap、Escape/关闭和返回焦点；异步 loading 要表达 busy/progress，而不是持续插入“正在加载”文本；执行危险动作前的确认必须能用键盘和辅助技术完整操作。

## Browser UI 与网页无障碍要分别验证

Views/原生 UI、WebUI、Extension 页面和 content script 浮层最终进入平台 accessibility adapter 的路径不同。网页 DevTools Accessibility pane 能解释页面节点，却不能证明 Browser toolbar、侧边栏容器和系统菜单的 AX 行为。

跨边界组件还要检查焦点从地址栏进入 WebContents、从页面进入侧边栏、关闭面板后返回原元素，以及多个窗口/Profile 下的 active descendant。视觉上同处一个窗口，不代表它们共享一个简单焦点树。

## 国际化不仅是替换字符串

GRIT/resource bundle、locale fallback、ICU 格式化、日期数字、复数、排序、字体 fallback、line breaking 与 bidi/RTL 共同决定本地化结果。字符串能显示中文，不代表布局、读序和语义正确。

RTL 验证不能只做 `direction: rtl` 截图。需要检查图标方向、快捷键、地址/代码等 LTR 片段、混排光标、弹层锚点和平台菜单。CJK 还要关注字体 fallback、字重、行高、标点挤压和缺字；长德语/俄语等文本能暴露固定宽度与截断问题。

## Locale 交付与用户选择是两层

Distribution 可以通过 Lean 决定安装包携带哪些 locale，并设置首次启动默认语言；运行中的用户语言、网站语言偏好和系统 locale 仍有自己的优先级。精简资源不能覆盖用户已选择语言，也不能让设置页列出未交付资源后静默失败。

升级场景要验证旧 Profile 语言、命令行 `--lang`、系统语言变化、资源缺失与 fallback。构建产物里存在 `.pak` 只能证明资源被交付，不能证明所有 UI 都引用了正确 message 和格式化参数。

## 建立可重复的真实用户验收

自动化可以检查 role/name/state、键盘顺序、对比度和资源完整性，但 VoiceOver、NVDA/Narrator 等真实辅助技术仍需平台验收。测试矩阵至少覆盖键盘-only、屏幕阅读器、缩放/高对比度、简体中文、英文、RTL 与长文本。

每次动态 Agent UI 变更都应记录：用户如何发现新内容，焦点是否被抢走，状态变化是否只播报一次，失败能否重试，运行中导航或面板关闭是否停止无效播报。这样“可用”才不是截图层面的结论。

## Snapshot 检查不能替代交互语义

AX tree snapshot 适合发现缺少 role/name/state，却不一定覆盖平台事件顺序、焦点移动和屏幕阅读器行为。动态 UI 还应验证 action：辅助技术触发 press/set value 是否进入同一产品路径，disabled/busy 状态是否阻止动作，节点更新后 focus 是否保持。

自动化通过后，仍要在目标 OS 的真实 adapter 与辅助技术上抽检；macOS、Windows 的 role 映射和事件节奏不能相互替代。

`prefers-reduced-motion`、高对比度、系统字体大小和页面缩放也会改变 AI 面板的可用性。动画降级不能让状态变化消失，高对比模式不能只靠背景色表达选中，200% 缩放下关键操作仍需可达且不被截断。

这些设置应纳入自动化截图与真实交互抽检。

## 工程结论

Accessibility 与 i18n 不是发布前装饰，而是 Browser UI contract 的组成部分。AI 让内容更动态、文本更长、状态更多，也让语义、焦点、节流和本地化的正确性更加重要。

## 继续阅读

- [17-下载、文件访问、PDF 与打印：网页字节如何受控地变成本机对象](/blog/0392dfd397ada650): 相邻章节的前置机制。
- [19-Extension Runtime、MV3 与注入边界：扩展不是常驻页面脚本](/blog/0a08e5b4f498a778): 相邻章节的后续机制。

## 上游源码入口

文中的相对源码路径可从 [Chromium 官方上游快照](https://chromium.googlesource.com/chromium/src/+/b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b/) 定位。此入口保留原稿的上游阅读坐标，不包含任何产品定制代码，也不替代运行时验收。
