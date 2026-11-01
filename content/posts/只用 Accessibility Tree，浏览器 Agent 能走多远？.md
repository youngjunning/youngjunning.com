---
id: "98c0567121f59475"
title: "只用 Accessibility Tree，浏览器 Agent 能走多远？"
description: "从焦点、角色、名称、状态和观察范围入手，判断 Accessibility Tree 何时足以支撑受控的浏览器自动化。"
date: "2026-10-30"
topic: "architecture"
tags: ["Browser Agent","Accessibility Tree","Mastra","agent-browser","Playwright","CDP"]
collection: "docs"
cover: "/media/98c0567121f59475-8382d1de4c6b2ca4.webp"
---

从焦点、角色、名称、状态和观察范围入手，判断 Accessibility Tree 何时足以支撑受控的浏览器自动化。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

浏览器自动化常把 DOM、Accessibility Tree 与截图并列。判断 AX Tree 能否独立承担观察，需要先分清页面语义、动作定位与业务结果核验。

## 从 Tab 外框开始：Accessibility 到底是什么

文章标题旁有一个很小的永久链接图标。按 Tab 到达它时，图标周围出现外框。这是在提示**链接获得了键盘焦点**，也就是接下来的键盘操作会作用于这里。它是 Accessibility 的一个可见表现；可访问性还要求页面把“这是什么、叫什么、现在什么状态、与谁有关”提供给辅助技术和用户。

![原创四格漫画：Tab 焦点、链接名称、可读标题与自定义按钮的区别](/media/98c0567121f59475-dc4a3d5c0fd87985.webp)

用一个简化的链接说明这些信息怎样形成。下面是教学示例，不是对真实页面截图的复制：

```html
<a class="heading-link"
   href="#tools"
   aria-label="此章节的永久链接">#</a>
```

| 检查器显示的信息 | 信息从哪里来 | 应怎样理解 |
| --- | --- | --- |
| Role: link | 带 href 的原生 a 元素 | 它是一个导航链接，通常可用 Enter 激活 |
| Name: 此章节的永久链接 | 本例中的 aria-label | 图标很短，辅助技术仍能知道用途 |
| Keyboard-focusable | 元素类型、焦点规则和当前状态 | 它能获得焦点；这不是一个同名 HTML 属性 |
| focused | 实际运行中的焦点位置 | 本次焦点是否在这里，不由作者填写 aria-focused |
| Contrast | 前景色、背景色等样式的计算与诊断 | 对比度与可访问性有关，但不是 aria-* 属性 |

外框通常由浏览器默认样式或 CSS 绘制。例如：

```css
.heading-link:focus-visible {
  outline: 2px solid #286b66;
  outline-offset: 4px;
}
```

`:focus-visible` 是 CSS 伪类，`outline` 是 CSS 属性。它们负责把焦点画出来，不提供控件名称，也不改变角色。给外框改成紫色，并不会让 AX Tree 多出“被选中”状态；去掉外框，也不会自动移除元素的焦点资格，却可能让键盘用户难以判断当前位置。[CSS focus-visible](https://www.w3.org/TR/selectors-4/#the-focus-visible-pseudo)、[W3C 焦点可见性](https://www.w3.org/TR/WCAG22/#focus-visible)

父标题整行的底色变化也可能由站点样式控制。外框和背景是视觉反馈，是否存在 `aria-selected` 则要看控件语义与实际状态，不能只按颜色推断。

### 获得焦点和被选中，是两件事

焦点回答“键盘现在操作谁”；选择状态回答“组件当前选择了哪一项”。手动激活的 Tabs 可以让焦点先移动到第二个 tab，第一项仍保持选中，直到用户按 Enter 或 Space 激活新项。普通链接通过 Tab 获得焦点时，不应为了描述这件事加上 `aria-selected="true"`。[W3C 焦点与选择](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)

| 概念 | 常见表达 | 示例 |
| --- | --- | --- |
| 焦点 focus | 浏览器真实焦点，AX 中可体现 focused | Tab 到“查询”按钮，尚未执行查询 |
| 选择 selected | 支持该语义的角色上的 aria-selected | tab、option 等组件中的选中项 |
| 勾选 checked | 原生 checkbox/radio 状态，或相应角色的 aria-checked | 是否接收航班通知 |
| 当前项 current | aria-current="page" 等 | 导航中标识当前所在页面 |

例如，下面只截取 Tabs 的状态声明，**不构成完整组件实现**：

```html
<div role="tablist" aria-label="查询方式">
  <button role="tab" aria-selected="true" tabindex="0">按航班号</button>
  <button role="tab" aria-selected="false" tabindex="-1">按城市</button>
</div>
```

程序可以让第二个 tab 获得焦点，同时保持它的 `aria-selected="false"`，第一项仍然选中。实际 Tabs 还要处理方向键、Tab 顺序、激活方式及关联面板，不能只贴这几个属性就算完成。[W3C Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)

### Tab 能不能到达，不是 AX Tree 的收录标准

普通标题和段落通常不需要成为 Tab 停靠点，但它们仍可暴露标题、层级和文本。屏幕阅读器可以通过自己的标题导航等方式读取；浏览器 Agent 也可以从 AX 观察中读取。反过来，一个 `tabindex="0"` 的普通容器虽然通常能被 Tab 到达，也不因此自动拥有按钮的语义与行为。

```html
<h2>工具与运行底座</h2>
<p>这段文字供用户阅读，不需要每次按 Tab 都停在这里。</p>

<!-- 通常可由 Tab 到达，但仍只是一个容器 -->
<div tabindex="0">普通容器</div>

<!-- 通常不进入 Tab 顺序，但可由程序 focus() 聚焦 -->
<h2 id="result" tabindex="-1">查询结果</h2>
```

`tabindex="0"` 通常让元素参与顺序焦点导航；`-1` 通常把它排除在 Tab 顺序之外，同时允许程序聚焦。不要用正数 tabindex 编排一套与文档顺序脱节的跳转路线。操作系统、浏览器和用户偏好也会影响实际 Tab 路径，macOS 上尤其不能假定所有配置完全一致。[WHATWG 焦点与 tabindex](https://html.spec.whatwg.org/multipage/interaction.html#the-tabindex-attribute)

## 一、先明确“只使用”约束了哪一层

“不用截图”“只给模型语义快照”“完全通过原生 Accessibility API 操作”是三种不同的实验。

| 约束 | 模型收到什么 | 执行器仍可能使用什么 | 本文是否采用 |
| --- | --- | --- | --- |
| 不使用视觉模型 | 文本、DOM、语义快照等 | CSS、DOM、坐标、Playwright | 仅此条件不足以定义本实验 |
| ARIA snapshot-only 观察 | 工具生成的角色、名称、状态和引用 | DOM 遍历、名称计算、Locator | 用于解释现有工具 |
| 原生 AX-only 观察 | CDP 返回的角色、名称、值、状态、父子关系 | 从语义引用重新定位、检查可操作性并执行 | Demo 采用 |
| 原生 AX 观察与动作 | 平台 Accessibility 数据 | 平台 AX 的默认动作、焦点、设值、滚动等 | 未实现 |

Chromium 的原生 Accessibility 系统支持辅助技术发起默认动作、聚焦、改变值与滚动。CDP 的 `Accessibility` 域则主要提供查询和事件，并没有通用的 `click`、`fill` 接口。不能因为使用了 `Accessibility.getFullAXTree()`，就假定动作执行也已经解决。[Chromium Accessibility Overview](https://chromium.googlesource.com/chromium/src/+/main/docs/accessibility/overview.md)、[CDP Accessibility](https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/)

这个区分决定了实验结论的范围：模型没有观察 DOM，不代表系统内部完全不接触 DOM。本文允许后者，但不允许执行器把额外读到的页面内容悄悄补给模型。

## 二、AX Tree 提供什么，又省略了什么

Accessibility Tree 把页面转换为辅助技术能够使用的语义表示。HTML 的原生元素、ARIA、名称计算和浏览器状态共同影响结果。它不是完整 DOM 的另一种缩进格式。

例如一个正确关联标签的输入框，可以提供 `textbox` 角色、字段名称、当前值、只读状态；按钮可以提供名称与禁用状态。模型因此有机会直接围绕“填写航班号”“点击查询”组织动作，而不必先理解 CSS class 或页面像素。[HTML Accessibility API Mappings](https://www.w3.org/TR/html-aam-1.0/)

名称也不等于 `innerText`。`aria-labelledby`、`aria-label` 和原生标签都可能参与名称计算；按规则引用的隐藏内容也可能贡献名称。树中的语义存在，并不保证对象位于当前视口，更不保证没有被其他元素遮挡。[Accessible Name and Description Computation](https://www.w3.org/TR/accname-1.2/#computation-steps)

这是一种有明确损失的信息投影：布局装饰通常被省略，纯颜色含义可能缺失，未挂载的数据不会自动出现。`role="presentation"` 通常移除角色语义，不能简单理解为隐藏所有后代；`aria-hidden` 的树排除规则也有例外。分析失败时，需要查看浏览器实际返回了什么。[WAI-ARIA 树排除规则](https://www.w3.org/TR/wai-aria-1.2/#tree_exclusion)

### 哪些属性会参与可访问语义

需要分开看三层：开发者写下的 HTML/ARIA、浏览器计算出的语义结果，以及工具的展示格式。不是所有可访问信息都要手写 `aria-*`，也不是每项 AX 信息都存在一个同名 HTML 属性。

![原创四格漫画：输入框名称、当前值与状态、描述关系和实际禁用行为](/media/98c0567121f59475-37e280041aac1345.webp)

| 语义信息 | 常见输入或来源 | 说明 |
| --- | --- | --- |
| 角色 role | 原生 button、a、input 等；必要时使用合法 role | 说明它是什么控件，role 不会自动补齐交互行为 |
| 名称 accessible name | 可见文字、label、alt、aria-labelledby、aria-label 等 | 用于辨认控件；命名机制取决于元素和角色 |
| 描述 description | aria-describedby 关联的提示文字等 | 提供额外说明，和名称各有用途 |
| 当前值 value | 输入框当前 value；aria-valuenow、aria-valuemin、aria-valuemax、aria-valuetext 等 | 后几项用于支持相应语义的范围控件，不能随意加在任何元素上 |
| 焦点资格与位置 | 元素类型、tabindex、disabled/inert 等状态，以及实际聚焦 | 不存在通用的作者属性 aria-focused |
| 禁用与只读 | 原生 disabled、readonly；合适角色上的 aria-disabled、aria-readonly | 声明和行为不能混为一谈 |
| 选择与勾选 | 原生 checked/selected 状态；aria-checked、aria-selected | 只在支持相应语义的元素和角色上使用 |
| 展开状态 | aria-expanded | 表达折叠或展开，脚本仍需更新实际内容 |
| 组件关系 | label 的 for/id、aria-labelledby、aria-describedby、aria-controls 等 | 关联标签、说明和被控制区域；并非都需要在文本快照中展开 |
| 校验与异步反馈 | 原生约束、aria-invalid、aria-busy、aria-live、status 等 | 状态必须随真实结果更新，不会代替校验或异步逻辑 |
| 语义隐藏 | aria-hidden；原生 hidden、inert 和可见性规则也会影响结果 | 不同机制对视觉、焦点与语义的影响不同 |

`role`、`tabindex`、`label`、`disabled` 都参与可访问性，但它们不是 `aria-*` 属性。反过来，`class`、`id` 或 `name` 也不因为出现在控件上就自动成为它的 accessible name。尤其是输入框的 `name="flightNo"`，通常是表单提交键，不是读给用户听的名称。

### 示例一：把输入框的名称、值和描述分开

```html
<label for="flight">航班号</label>
<input id="flight"
       name="flightNo"
       value="8032"
       aria-describedby="flight-help">
<p id="flight-help">请输入数字，不含 CZ 前缀。</p>
```

这段代码表达三件不同的事：名称是“航班号”，当前示例值是“8032”，补充描述是输入格式。`for` 与 `id` 让标签和输入框建立关联；`name="flightNo"` 留给表单提交使用。placeholder 可以提示格式，但不宜替代持久的可见标签。[W3C 表单标签](https://www.w3.org/WAI/tutorials/forms/labels/)

需要引用已有可见文字时，可以使用 `aria-labelledby`；只有图标而没有合适文字时，可以用 `aria-label` 提供名称。不要把各种命名方式无条件叠加：它们有计算顺序，可能覆盖原生标签。通常优先使用合适的原生标签，再核对浏览器最终算出的名称。`aria-labelledby` 与 `aria-describedby` 接受的是被引用元素的 ID，不是直接填写说明正文。[W3C 名称与描述](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)

某些元素还可能按规则从 title 或 placeholder 得到回退名称。因此“检查器里出现了 Name”也不等于标签设计已经合格，仍需核对这个名称是否稳定、清楚，并与用户看到的字段含义一致。

### 示例二：优先使用原生按钮，不让 role 承担它做不到的事

```html
<!-- 原生按钮已有预期的键盘激活行为 -->
<button type="button">查询</button>

<!-- 只声明了角色和焦点参与，仍缺少行为实现 -->
<div role="button" tabindex="0">查询</div>
```

第二种写法可以向辅助技术声明“我是按钮”，但 `role="button"` 不会自动添加 Enter/Space 激活、事件处理或正确的禁用逻辑。可用原生 button 时，优先直接使用。否则 AX 中有 button，也可能遇到“按键没有反应”的实现缺口。[W3C：角色意味着交互承诺](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/)

### 示例三：禁用、只读和隐藏，各自改变不同的东西

```html
<button disabled>提交</button>

<!-- 只有状态声明；作者仍需阻止鼠标和键盘激活 -->
<button aria-disabled="true">暂不可提交</button>

<label for="date">出发日期</label>
<input id="date" value="2026-10-28" readonly>

<!-- 仅隐藏装饰图标的语义，保留“查询”作为按钮名称 -->
<button type="button"><span aria-hidden="true">🔎</span>查询</button>
```

原生 `disabled` 在支持它的控件上具有实际禁用行为，通常也使其退出 Tab 顺序；单独 `aria-disabled` 只传达不可用状态，不自动阻止事件。`readonly` 表示不能直接编辑，不等于不能聚焦或不能读取值，这也是日期输入框常需要点击打开选择器的原因之一。[WAI-ARIA disabled](https://www.w3.org/TR/wai-aria-1.2/#aria-disabled)

`aria-hidden="true"` 本身不让像素消失，也不自动移除焦点资格。适合用它排除装饰图标等重复语义，不应用它隐藏仍可聚焦的控件或其祖先。否则键盘可能走到一个辅助技术无法正确识别的目标。[WAI-ARIA hidden](https://www.w3.org/TR/wai-aria-1.2/#aria-hidden)

### 示例四：展开状态与错误提示，都要随界面更新

```html
<button type="button" id="more-button"
        aria-expanded="false" aria-controls="more">
  更多筛选
</button>
<section id="more" hidden>筛选项……</section>

<label for="code">航班号</label>
<input id="code" aria-invalid="true"
       aria-describedby="code-error">
<p id="code-error">请输入 3 到 4 位数字。</p>
```

点击“更多筛选”时，脚本需同时更新内容是否显示和 `aria-expanded`。`aria-controls` 只表达控制关系，不会自动把按钮连成可工作的折叠组件。输入错误也是如此：`aria-invalid` 告知当前错误状态，`aria-describedby` 关联说明；实际校验、清除错误和提交处理仍由程序完成。[W3C Disclosure Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)

异步查询还可以用 `role="status"` 的区域承载“正在查询”“查到两个航段”等更新。`status` 隐含适合非紧急通知的 polite live 语义；`aria-live`、`aria-atomic` 等用于控制通知方式，`aria-busy` 用于表达更新尚未完成。它们不会替程序发请求，也不保证一个只轮询快照的 Agent 自动订阅了屏幕阅读器通知，仍需按实际接口重新观察。[WAI-ARIA status](https://www.w3.org/TR/wai-aria-1.2/#status)

这些属性共同解释了 AX-only 自动化为什么既有价值也有边界：Agent 可以从可靠语义知道目标及状态，但无法凭一条 `role` 或 `aria-expanded` 保证页面实现与声明一致。

## 八、采用之前，先检查四个条件

| 条件 | 需要回答的问题 | 不满足时的处理 |
| --- | --- | --- |
| 目标可观察 | 必要控件和字段是否出现在语义表示中？ | 修复页面语义，或明确采用其他观察方式 |
| 目标可区分 | 重名元素能否由行、区域、业务对象关联？ | 扩展带范围的定位；当前不能消歧则停止 |
| 动作受支持 | 执行器是否能把 AX 目标转换成正确操作？ | 补齐角色、动作和 frame 支持，再归因于页面 |
| 结果可验证 | 参数与业务结果能否通过 AX 再次确认？ | 保留受阻或未验证状态，不以调用成功替代业务结果 |

虚拟列表还需要额外关注观察范围。总行数、行索引不能代表未挂载行的内容；滚动、翻页或筛选后仍要重新观察。`getFullAXTree()` 的 full 也不等于自动解决所有跨进程 iframe，跨 frame 支持仍需由具体执行器单独验证。[W3C Grid and Table Properties](https://www.w3.org/WAI/ARIA/apg/practices/grid-and-table-properties/)、[CDP getFullAXTree](https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/#method-getFullAXTree)

## 要不要用：我的判断框架

语义完整、任务范围受控的后台表单，值得把 AX-only 观察作为可测量的基线。它能帮助判断一次失败发生在观察、候选构造、目标绑定还是结果验收，也会直接暴露页面语义质量问题。

面对第三方站点，应先检查真实任务中的关键控件，再决定是否坚持这条路线。缺少必要语义时，可以明确转入混合观察，也可以保持 AX-only 并报告受阻；两者都需要如实记录实验条件。

最值得保留的是一个工程判断：**每次声称“Agent 看到了页面”，都应说明它实际收到了哪种表示；每次声称“任务成功”，都应指出由什么证据确认了业务结果。**
