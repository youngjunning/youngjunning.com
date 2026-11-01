---
id: "0392dfd397ada650"
title: "17-下载、文件访问、PDF 与打印：网页字节如何受控地变成本机对象"
description: "从源码阅读入口、进程边界与验证条件理解下载、文件访问、PDF 与打印：网页字节如何受控地变成本机对象。"
date: null
topic: "principles"
tags: []
collection: "docs"
cover: "/media/0392dfd397ada650-a0ef2592daebcc42.webp"
---

从源码阅读入口、进程边界与验证条件理解下载、文件访问、PDF 与打印：网页字节如何受控地变成本机对象。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

![Chromium 下载、PDF、打印与本机文件边界封面](/media/0392dfd397ada650-a0ef2592daebcc42.webp)

> 阅读坐标沿用原稿：Chromium `153.0.8010.37`，上游 commit `b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b`。本次同步未重新进行源码与目标平台运行时验收。

![网页数据如何经过 Browser 边界成为本机文件或打印输出](/media/0392dfd397ada650-19ff1bfb98a8f15b.webp)

## 一句话结论

下载、文件选择、PDF 与打印虽然都触及本机对象，却拥有相反的数据方向、不同用户确认和不同生命周期；它们不能被压缩成一个“文件权限”或交给 Renderer/Runtime 直接执行。

浏览器从网络收到一串字节，到用户磁盘上出现一个文件，中间不是一次 `write()`。下载要选择目标路径、避免文件名冲突、处理重定向与中断、展示危险告警、接受 policy/企业检查；网页选择本地文件则要经过 Browser-owned picker 和受限文件访问；打印与 PDF 又在页面渲染、预览、转换、系统打印后端之间跨越多个进程。

共同原则是：**Renderer 可以提出“下载、选择、打印”的 Web 请求，但不能自行决定用户磁盘路径、系统设备或最终外发对象。** Browser 必须持续拥有这些本机资源的选择、授权、生命周期和审计边界。

## 四条路径不是同一种“文件操作”

| 场景 | Web/产品入口 | Browser 最关键的控制 | 结果对象 |
| --- | --- | --- | --- |
| 下载 | navigation response、`download` 属性、产品下载动作 | 是否创建 download、目标路径、冲突、安全/policy、暂停/取消 | DownloadItem 与磁盘文件 |
| 上传/打开本地文件 | `<input type=file>`、File System 相关 API | picker、可选范围、文件 token/授权、document 生命周期 | 受限 file handle/选中文件 |
| PDF 查看/保存 | PDF response、内置 viewer、下载 | viewer/extension/service、数据流和下载/打印分支 | PDF viewer 或保存的文件 |
| 打印 / Save as PDF | `window.print()`、浏览器 UI | 当前 WebContents、预览、目标 printer、系统 dialog/policy | print job、spool 或 PDF 文件 |

它们都会触及本机数据，却不应共享一个“文件权限 boolean”。下载处理的是从网络到本机的受控落盘；file chooser 是将用户显式选择的文件暴露给当前网页；打印可能把页面内容送进系统 printer 或输出 PDF。caller、数据方向、用户确认、持久化和撤销语义各不相同。

## Download：从网络请求变成可观察的 `DownloadItem`

Content 层的 `content/public/browser/download_manager.*`、`content/browser/download/download_manager_impl.*` 管理 BrowserContext 范围的下载和 `DownloadItem` 生命周期。下载不是 Renderer 对路径的直接写入：网络/导航路径触发候选下载后，Browser 创建并观察 item，delegate 和 Chrome 层再参与目标选择、UI、安全与完成处理。

```text
navigation / network response or download request
  -> Browser DownloadManager creates DownloadItem
     -> delegate / target determination / policy & safety checks
        -> temporary target + data transfer + interruption/resume state
           -> final path reservation / rename / user-visible completion
```

Chrome 的 `download_target_determiner.*`、`download_prefs.*` 与 `ChromeDownloadManagerDelegate` 说明 filename、目录、冲突处理和 prompt 不是下载 URL 自己决定的。实际输入还可能包含 Content-Disposition、suggested filename、用户下载目录、policy、危险状态和企业 connector。下载成功更不只意味着 HTTP 成功：必须区别 item 创建、开始写入、interrupted、危险提示、用户确认、final rename 和完成事件。

| 现象 | 不能直接推出的结论 | 应检查 |
| --- | --- | --- |
| 服务端返回 attachment | “文件一定会直接落到默认目录” | target determination、prompt/pref/policy、路径冲突、磁盘权限 |
| 网络传输完成 | “用户已拿到可打开的安全文件” | danger/safe browsing、企业扫描、rename、用户确认和最终状态 |
| 下载列表有一条记录 | “文件仍在该路径且属于当前页面” | DownloadItem state、Profile、文件移动/删除、导航/Tab 生命周期 |
| 自动化拿到文件名 | “可将该路径回传给任意 Runtime” | 数据分类、caller、用户授权与路径泄露风险 |

下载的 Profile 归属也很重要。normal、OTR 和不同 BrowserContext 的下载记录、临时文件和最终可见性不应因 URL 相同就默认共用。产品能力若要“代用户下载并处理文件”，首先应定义它拿到的是 download id、受限文件引用、一次性流，还是可读路径；绝不能将任意本机绝对路径当作 Extension/Runtime 的通用返回值。

## File chooser：用户选择授予的是有限文件能力

`content/browser/web_contents/file_chooser_impl.*` 和 Blink `file_chooser.mojom` 连接网页的 chooser 请求与 Browser 侧实现。选择器的存在就是安全模型的一部分：网页通常不能枚举本机目录，也不应靠构造路径读取任意文件；Browser/平台 picker 让用户选择可暴露的对象，并把结果限制在对应 document/request 的使用范围内。

```text
Renderer document requests chooser
  -> Browser validates WebContents/frame state
     -> platform picker and user selection
        -> Browser returns constrained file selection
           -> Renderer exposes Web File / upload stream to that document
```

实际实现会受 sandbox、平台 file token/bookmark、拖拽、accept type、directory/multiple 选项、iframe 与 Web API 限制影响。文章或产品设计不应从“网页获得 `File` 对象”推出“它能在后台持续访问同一路径”，更不能借由 Browser Native API 将选择结果升级为全局文件系统能力。

对 Agent 场景，较安全的 contract 是让 Browser 展示用户可理解的选择动作，随后向获准 caller 交付范围明确、短生命周期、可审计的文件内容或 capability；当 Tab 导航、用户取消、Profile/OTR 改变或 Runtime 断连时，应定义是否立即撤销。文件名、路径、内容和上传目标都可能是敏感数据，普通调试日志不应记录原文。

## PDF：查看、搜索、保存与打印是多条服务链

PDF 不是浏览器只靠 `<embed>` 显示的一块普通页面。基线中 `chrome/browser/pdf/` 管理 viewer stream 等 Chrome 侧接合，`chrome/services/pdf/` 提供 PDF service、thumbnail/search 等 Mojo 接口，`chrome/renderer/plugins/pdf_plugin_placeholder.*` 表示 renderer/plugin 侧还有专门入口。PDF response 可能进入内置 viewer、被下载、被 iframe 嵌入、被搜索/缩略图服务消费，或进入打印转换路径。

因此“PDF 打不开”至少要分清：响应是否被识别为 PDF、viewer 是否被允许/加载、stream 是否到达、plugin/extension/service 是否可用、是否被 policy/feature 禁用，还是文件本身解析失败。把它统一归因于网络或下载，会错过真正所在的进程与服务边界。

## 打印：页面渲染结果到系统设备的最后一段

打印通常从 WebContents/页面的 `window.print()` 或 Browser UI 开始。Renderer 的 `components/printing/renderer/print_render_frame_helper.*` 负责将页面打印所需的渲染侧工作接入；Browser 的 `PrintViewManager`、`PrintManager`、`PrintJob`/worker 与 `chrome/browser/ui/webui/print_preview/` 连接预览、用户配置和实际 job。Print Preview 本身是 Browser 产品 UI，不是网页可以替代的可信对话框。

```text
current WebContents / frame requests print
  -> Browser PrintViewManager / PrintManager coordinates preview
     -> Renderer prepares printable document/pages
        -> print preview chooses printer/settings or Save as PDF
           -> PrintJob / platform backend / spool or PDF conversion
```

这个过程在打印时仍要尊重当前 document。预览出现、用户选择打印机或保存路径之前，页面可能导航、Tab 关闭、Renderer crash 或 policy 改变；结果不应被写给已经失效的请求。`print_preview` 的 trusted/untrusted WebUI、handler、printer handler 与平台 converter 入口也提示：打印机列表、系统对话框和最终输出不能由普通网页或 Extension 自行伪造。

| 需求 | 正确 owner/边界 |
| --- | --- |
| 页面只想请求打印 | Web API；Browser 决定产品 UI 与最终 printer flow |
| 用户选择打印机、份数、保存 PDF 路径 | print preview / platform dialog；受 policy 与系统权限约束 |
| 业务想导出一份数据 PDF | 明确生成与下载/保存 contract；不得默认为静默外发或落盘 |
| Runtime 想“代用户打印” | 必须有受限 Browser capability、用户确认、目标范围和审计；不能借 CDP/本机路径绕过 UI |

macOS、Windows、Linux/CUPS 等后端的 printer discovery、权限、driver、spooler 和 PDF conversion 不同。预览显示成功不能证明物理打印机已完成 job；Save as PDF 成功也不等于打印机路径可用。必须按目标平台分别验收。

## 建议的追踪任务：解释“下载完成但用户找不到文件”

1. 记录 download id、URL/redirect、Profile/OTR、suggested filename、创建/中断/完成时间与最终 `DownloadItem` 状态。
2. 检查 target determination：默认目录、prompt、policy、路径保留/重名、磁盘空间/权限、危险告警和企业检查。
3. 分别确认临时文件、最终 rename、UI completion 和实际文件存在；不要只看 HTTP 完成或下载气泡。
4. 若由 Extension/Runtime 触发，验证 caller、用户确认、返回的数据范围和 Tab navigation/close 后的取消；禁止把完整路径和文件内容写进普通日志。
5. 在 macOS/Windows 分别用 signed Distribution、受管理/未受管理 Profile、普通/无痕和旧客户端升级后重复测试。

## 本文已核验的源码锚点

| 主题 | 源码入口 |
| --- | --- |
| Content download 生命周期 | `content/public/browser/download_manager.*`、`content/browser/download/download_manager_impl.*`、`components/download/` |
| Chrome 目标与 UI 决策 | `chrome/browser/download/download_target_determiner.*`、`download_prefs.*`、`download_core_service.*`、`chrome_download_manager_delegate.*` |
| 文件选择 | `content/browser/web_contents/file_chooser_impl.*`、`third_party/blink/public/mojom/choosers/file_chooser.mojom` |
| PDF viewer/service | `chrome/browser/pdf/`、`chrome/services/pdf/`、`chrome/renderer/plugins/pdf_plugin_placeholder.*` |
| 打印与预览 | `components/printing/renderer/print_render_frame_helper.*`、`components/printing/browser/print_manager.*`、`chrome/browser/printing/print_view_manager.*`、`print_job.*`、`chrome/browser/ui/webui/print_preview/` |
| 平台 PDF/打印转换 | `printing/pdf_render_settings.h`、`chrome/services/printing/`、平台 printer handler 与 browser tests |

## 运行时验证路径

- 在 macOS/Windows 的普通、OTR、受管理 Profile 中验证 download 的 allow/block/prompt、重名、暂停/恢复、危险告警/企业扫描、路径权限与最终文件存在；覆盖真实网络中断。
- 测试 file chooser 的 cancel、multiple/directory、iframe、navigation/Tab close 与系统权限；确认文件引用不能被无关 document、Extension 或 Runtime 复用。
- 对 PDF 的 viewer、iframe、下载、搜索、保存和打印分别取证，区分 service/插件加载、内容解析、policy 与平台后端失败。
- 用真实打印机和 Save as PDF 各跑一次 print preview；记录 printer/policy/system dialog、job 状态和输出 hash。无真实物理打印验收时，只能报告预览或转换完成。

## 从故障反推边界：下载完成，但用户找不到文件

网络层 complete 只说明字节传输结束。目标路径选择、临时文件、danger/enterprise 检查、rename、冲突处理、系统权限、用户取消和最终 `DownloadItem` 状态仍可能让文件没有出现在预期位置。排障应沿 item identity 记录 URL request、target determination、intermediate path、扫描/确认、final rename 与文件实际存在性。

file chooser 的方向恰好相反：用户主动选择一个本机对象并将有限访问授予当前 document。该授权不能被旧页面、另一个 frame、Extension 或 Runtime 复用。PDF/打印又可能产生新 renderer/service、系统 dialog 或物理设备 job，因此“预览正常”并不等于最终输出成功。

## Download 是一个持续状态对象，不是一次网络回调

下载从 URLLoader/response 进入 DownloadItem 后，还会经历目标路径确定、临时文件、写入、危险性检查、用户确认、完成、中断与恢复。网络收到全部 bytes 只是其中一个条件；文件 rename、扫描、磁盘空间、权限和用户动作都可能让最终状态不同。

排查下载问题时应记录 download id、source URL/origin、initiating frame/document、target/intermediate path、received/total bytes、interrupt reason、danger state 和 final state。不要在日志中暴露用户真实路径或文件内容；可以保留脱敏目录类型、扩展名和错误枚举。

恢复下载还要验证服务器是否支持 range、ETag/Last-Modified 是否匹配、临时文件是否仍完整。直接续写旧文件而不校验远端对象，可能得到内容拼接错误但表面“下载完成”的产物。

## File chooser 授予的是一次受限选择

网页发起 file input 或相关文件选择 API 时，Browser/平台 picker 让用户选择对象。返回结果属于当前 frame/document 与用户动作，页面不能预先指定任意本机路径并绕过 picker。目录、多选、文件类型过滤和持久化 handle 还各有额外规则。

选择完成前发生导航、frame detach 或窗口关闭时，结果应取消；选择完成后，Renderer 获得的也应是受控能力或文件信息，不是 Browser 把整个文件系统权限交给页面。对 Extension/WebUI 的内部文件能力，同样不能因为 caller“可信”就跳过 Profile、路径范围、大小和用户确认。

## PDF 同时包含内容、Viewer 与本机交付

PDF response 可能进入内置 viewer/Extension、下载或外部处理。Viewer 显示成功不代表保存成功，页面打印成功也不代表原 PDF bytes 被原样输出。搜索、表单、脚本、字体、无障碍、打印和 save-as 经过不同组件与平台路径。

验证 PDF 问题时要区分：response MIME/Content-Disposition 决策、viewer 加载、PDF renderer、页面交互、保存/下载、打印。安全上还要覆盖恶意 PDF、跨 origin embedding、blob/data URL、下载策略和 viewer 权限，不能只测试一份正常本地文件。

## Print Preview 与系统打印是两个提交点

打印通常先由页面生成打印参数与内容，进入 print preview 或直接打印路径，再交给系统 spooler/driver。预览只证明 Chromium 生成了可展示的 print result；用户在系统对话框确认、job 进入队列、设备实际输出是后续状态。

页边距、DPI、纸张、缩放、背景、字体替换和分页都可能在不同阶段改变结果。跨平台回归需要保存同一输入页面和设置，比较 PDF/preview、spool job 与真实输出；一张界面截图不能证明分页和字体准确。

## 本机对象需要统一的审计字段

下载、选择、PDF 保存和打印虽然不共享权限，却可以共享一套最小审计模型：caller/Profile、frame/document、用户动作、对象类型、策略决策、系统交接、最终状态和错误类别。敏感路径、文件名与内容默认不记录。

## 故障注入比 happy path 更能暴露泄漏

至少覆盖下载中断后恢复、磁盘满、目标文件占用、picker 打开时导航、用户取消、PDF viewer crash、print preview 关闭、spooler 不可用和 Browser 退出。检查临时文件、handle、后台 task 与 UI 状态是否正确收口。

通过条件不只是“不崩溃”：不能留下错误命名的 final file，旧 document 不能收到 picker 结果，取消打印不能误报完成，重启后未完成对象要么可恢复，要么有清晰失败记录。

## 外部应用交接是另一条信任边界

下载完成后“打开文件”、外部协议、系统默认应用与 reveal-in-folder 会把对象交给 Chromium 之外的进程。Browser 应基于文件危险性、来源、用户动作与平台策略决定是否允许，并明确交接成功不等于外部应用处理成功。

测试要覆盖未知扩展名、可执行文件、重复文件名、无默认应用、外部应用拒绝和交接时 Browser 退出。Agent 不应在没有显式用户确认时自动打开任意下载产物。

路径选择与最终写入之间还存在 TOCTOU 风险：目录权限、符号链接、同名文件和挂载状态都可能变化。Browser 应在实际创建/替换对象时再次处理平台错误，避免仅凭 picker 阶段的检查承诺写入一定成功。

临时文件转 final file 时还应确保失败不会覆盖用户已有内容，并让重试继续引用正确的中间对象，而不是重新使用已经失效的路径授权。

## 工程结论

本机文件是 Browser 与操作系统共同拥有的高权限边界。把每条路径的 caller、数据方向、用户确认、临时状态、最终对象和撤销条件写清，才能避免用一个宽泛文件 API 破坏 Chromium 的隔离模型。

## 继续阅读

- [16-Pref、Policy、Feature Flag 与 Variations：同一份 Chromium 为什么表现不同](/blog/b87d8194f260201f): 相邻章节的前置机制。
- [18-Accessibility、国际化与平台语义：浏览器如何把“可用”交给真实的人](/blog/b33b3b84e02f9811): 相邻章节的后续机制。

## 上游源码入口

文中的相对源码路径可从 [Chromium 官方上游快照](https://chromium.googlesource.com/chromium/src/+/b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b/) 定位。此入口保留原稿的上游阅读坐标，不包含任何产品定制代码，也不替代运行时验收。
