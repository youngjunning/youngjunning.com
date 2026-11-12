---
id: "464258397d391ba6"
title: "拆解 agent-browser snapshot：一张订单页如何变成可执行的引用"
date: "2026-11-12"
updatedAt: null
description: "以固定提交的 snapshot.ts 和同名取消按钮的订单场景，拆解 ARIA 快照、ref、过滤选项、定位恢复与动作验证，并提供可交互演示。"
topic: "principles"
tags: ["agent-browser", "Browser Agent", "Playwright", "ARIA snapshot", "ref"]
cover: "/media/464258397d391ba6-cover.png"
---

页面里有两笔订单，每笔都有一个“取消”按钮。用户要求取消第二笔。浏览器 Agent 如果只收到 `button "取消"`，即使能点击，也无法判断按钮属于哪笔订单。`agent-browser snapshot` 的价值，正是在一份可读的页面语义文本里附上可执行的引用；它的限制也在这里：引用解决定位，业务对象仍要从上下文确认。

![订单页面中第二张卡片被高亮的文章封面](/media/464258397d391ba6-cover.png)

## 一句话总结

在[指定提交的 `src/snapshot.ts`](https://github.com/vercel-labs/agent-browser/blob/e02bc1a10cf8962a2a171d2b515f14e325dc97ab/src/snapshot.ts)中，`snapshot` 先调用 Playwright 的 `ariaSnapshot()`，再逐行生成 `ref → role/name/nth` 映射，并按 `interactive`、`compact`、`maxDepth`、`selector`、`cursor` 裁剪输出。`@eN` 是本次快照的定位入口，不是固定 DOM 节点 ID；同名目标、动态重排和过滤掉的业务上下文都需要调用方处理。

本文只讨论该提交中的旧版 Playwright 实现。它与较新 Chrome 原生路径直接读取 CDP AX Tree 的实现不同，不能把两者的引用生命周期混用。文中的订单、输出和演示均为教学场景，并非对上游 CLI 的实测截图。[新版路径对照](https://github.com/vercel-labs/agent-browser/blob/5868f7c05020e047c00e68e4abf9253cce864f41/cli/src/native/snapshot.rs)

## 场景：取消第二笔订单

假设页面有两张卡片：

| 订单 | 状态 | 操作 |
| --- | --- | --- |
| A-1042，周一出发 | 待支付 | 取消 |
| B-2086，周五出发 | 待支付 | 取消 |

一次完整观察可能包含卡片标题、状态和两个按钮。以下是根据场景写的**示意输出**，不是从真实站点采集的逐字结果：

```text
- main:
  - heading "我的订单" [ref=e1] [level=1]
  - article "A-1042，周一出发" [ref=e2]:
    - text: 待支付
    - button "取消" [ref=e3]
  - article "B-2086，周五出发" [ref=e4]:
    - text: 待支付
    - button "取消" [ref=e5] [nth=1]
```

Agent 根据订单号选中第二张卡片，再选择其中的取消按钮。这里有两层身份：`e5` 是本次输出分配的短引用；`nth=1` 是在两个 `button "取消"` 中取第二个的零基序号。若只看交互模式，订单号和状态可能消失，只剩两个同名按钮。此时应扩大观察范围，而不是凭第二个按钮恰好对应第二笔订单就直接执行。

可在[交互演示页](https://youngjunning.com/agent-browser-snapshot)切换快照选项、检查引用表、模拟重排和动作后复核。

这张演示页也是真实的 HTML 页面。若本机已有与本文固定版本相符的 `agent-browser`，可以用 CLI 对其实际 DOM 取快照；先读取页面输出，再选当次生成的 ref，**不要照抄下例中的编号**：

```bash
agent-browser open https://youngjunning.com/agent-browser-snapshot
agent-browser snapshot -s ".snapshot-browser-body"
agent-browser snapshot -s ".snapshot-browser-body" -i
```

演示页右侧的快照工作台是教学模拟器，用可见订单状态复现该文件的关键转换；上面三条命令才会调用真实的浏览器工具。模拟器额外保存订单身份并阻止错单点击，上游 `RefMap` 没有这项业务保护。[固定版本命令说明](https://github.com/vercel-labs/agent-browser/blob/e02bc1a10cf8962a2a171d2b515f14e325dc97ab/README.md#snapshot-options)

## 源码第一步：从 Playwright 取语义快照

`getEnhancedSnapshot()` 在每次调用开始时重置引用计数。它对指定 `selector` 使用 `page.locator(selector)`，否则使用 `page.locator(':root')`，然后调用 `locator.ariaSnapshot()`；空结果返回 `(empty)`。获得的 `ariaTree` 是文本，后续代码按换行拆开，并用正则识别每行的角色、可选名称和后缀。[采集入口与选项](https://github.com/vercel-labs/agent-browser/blob/e02bc1a10cf8962a2a171d2b515f14e325dc97ab/src/snapshot.ts#L260-L292)、[Playwright ARIA snapshot 文档](https://playwright.dev/docs/aria-snapshots)

这意味着 `snapshot.ts` 并未直接遍历浏览器原生 AX 节点；它处理的是 Playwright 已序列化的 ARIA 快照。`selector` 先改变采集范围，其他几个选项主要改变该文本如何呈现。对不符合正则格式的文本行，普通模式可能原样保留；因此下面描述的是这份实现的处理规则，而不是任意网页上的完整语义保证。

## 第二步：生成 ref，遇到同名目标加 nth

普通模式给交互角色分配 ref，也给**有名称的内容角色**分配 ref。前者包括 `button`、`link`、`textbox` 等；后者包括 `heading`、`article`、`region`、`cell` 等。所以完整快照中的 ref 不全是可点击对象。[角色集合](https://github.com/vercel-labs/agent-browser/blob/e02bc1a10cf8962a2a171d2b515f14e325dc97ab/src/snapshot.ts#L61-L101)、[逐行处理](https://github.com/vercel-labs/agent-browser/blob/e02bc1a10cf8962a2a171d2b515f14e325dc97ab/src/snapshot.ts#L459-L526)

每个映射项保存 `selector` 字符串、`role`、`name` 和可选 `nth`。生成器按 `role:name` 统计出现次数；重复项保留零基 `nth`，单独出现的目标在后处理时移除 `nth`。输出里只从第二个同名目标开始显示 `[nth=1]`，但引用表里的第一个目标也会保留 `nth: 0`。这项细节决定了第一笔订单和第二笔订单能否稳定区分。[重复追踪与清理](https://github.com/vercel-labs/agent-browser/blob/e02bc1a10cf8962a2a171d2b515f14e325dc97ab/src/snapshot.ts#L335-L442)

需要留意源码顶部的注释：它说 ref 可避免重新查询 DOM，但[引用解析实际代码](https://github.com/vercel-labs/agent-browser/blob/e02bc1a10cf8962a2a171d2b515f14e325dc97ab/src/browser.ts#L295-L322)在执行动作时会用 `page.getByRole(role, { name, exact: true })` 重建 Locator，并在需要时调用 `.nth(nth)`。因此这里的 ref 保存的是**定位配方**，没有把动作永久绑定在快照时的那个节点上。若两张订单在快照后重排，旧 `@e5` 仍可能匹配到另一个“取消”。重新观察并核对业务对象是执行方的责任。

## 第三步：裁剪输出时会丢掉什么

| 选项 | 源码动作 | 在订单场景里的代价 |
| --- | --- | --- |
| 默认完整快照 | 逐行附 ref，保留多数文本和结构 | 信息较多，但可看到订单号与按钮所属卡片 |
| `interactive` / `-i` | 只收集交互角色并改写为平铺行 | 两个“取消”仍在，订单号与状态通常不在 |
| `compact` / `-c` | 去掉部分无名结构行，再保留 ref、文本和含 ref 的祖先 | 某些包装层消失；不能假定父子层级完全保留 |
| `maxDepth` / `-d` | 用每两空格一层的缩进估深，超出即丢弃 | 深层订单按钮可能不可见 |
| `selector` / `-s` | 在调用 `ariaSnapshot()` 前限定 Locator | 订单区域外的确认弹窗或错误提示可能不在快照里 |
| `cursor` | 另扫 DOM，补 `cursor:pointer`、`onclick`、`tabindex` 线索 | 可发现无语义控件，也可能把“看似可点”误当成有效操作 |

`interactive` 路径不是在完整快照上简单隐藏文本：它重新遍历行，只给交互角色编号，并把层级压平成平铺列表。选项不同，`e1`、`e2` 的指向也可能不同。`compactTree()` 是一次基于文本行的处理，不解析真实树；它保留有 ref 的行、有内容的冒号行，以及下方存在 ref 的结构行。[过滤与压缩实现](https://github.com/vercel-labs/agent-browser/blob/e02bc1a10cf8962a2a171d2b515f14e325dc97ab/src/snapshot.ts#L389-L565)

`cursor` 模式则跨出 ARIA 文本，调用 `page.evaluate()` 扫描指定根节点下的 DOM：排除原生交互标签和已有交互 ARIA role，再检查计算样式、`onclick` 与 `tabindex`，过滤零尺寸与空文本元素，生成 CSS selector 和 `clickable` / `focusable` 伪角色。它通过文本与已有引用去重；同名但不同业务对象的线索可能被合并。因此该模式适合**发现候选**，不能代替语义修复或业务核对。[DOM 补充扫描](https://github.com/vercel-labs/agent-browser/blob/e02bc1a10cf8962a2a171d2b515f14e325dc97ab/src/snapshot.ts#L116-L245)、[合并逻辑](https://github.com/vercel-labs/agent-browser/blob/e02bc1a10cf8962a2a171d2b515f14e325dc97ab/src/snapshot.ts#L294-L330)

## 第四步：动作之后再取证

点击 `@e5` 只能证明定位与点击尝试发生。页面可能出现确认弹窗、取消失败提示，或者订单列表自动重排。完成任务至少要检查：弹窗指向的订单号是否是 B-2086；提交后状态是否从“待支付”变为“已取消”；若快照里找不到结果，是否需要扩大 `selector` 范围或取消 `-i`。[引用解析](https://github.com/vercel-labs/agent-browser/blob/e02bc1a10cf8962a2a171d2b515f14e325dc97ab/src/browser.ts#L295-L322)

针对这个场景，稳妥的调用流程是四步：先用完整快照确定业务对象与区域；仅在对象明确后用 `-i` 或局部范围减少噪声；执行前确认同名目标的序号仍对应正确对象；动作后重新获取足够范围的快照来验证结果。这是依据上述源码和场景提出的**调用方策略**，不是 `snapshot.ts` 自动提供的业务校验。

## 要不要用 / 我的判断框架

这个接口适合语义结构较好的页面：角色和名称让模型读得懂，短 ref 让后续命令易于表达。若页面有重复操作，保留业务容器和内容证据；若控件缺语义，可用 `cursor` 发现候选并回查实际元素；若页面频繁重排，缩短观察到执行的间隔，并在动作前后重新核对。`getSnapshotStats()` 的 token 数只是 `字符数 / 4` 向上取整的估算，不能当成模型实际计费或任务成功率。[统计实现](https://github.com/vercel-labs/agent-browser/blob/e02bc1a10cf8962a2a171d2b515f14e325dc97ab/src/snapshot.ts#L616-L640)

这份源码最值得带走的判断是：**压缩快照可以省阅读成本，但选中正确业务对象需要上下文；ref 可以重建定位，仍需在变化页面上重新验证。**
