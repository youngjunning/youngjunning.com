---
id: "eaa9d6fbf7fa29ec"
title: "漫画读懂 Zed Git 面板：Stage、Unstage 和 Stash"
description: "通过教学漫画说明 Zed 的 Staged/Unstaged 分组、Stage、Unstage、Commit Tracked 与 Stash，不带入真实项目上下文。"
date: "2026-10-29"
topic: "principles"
tags: ["Git","Zed","漫画","开发工具"]
collection: "docs"
cover: "/media/eaa9d6fbf7fa29ec-682a83482517f860.webp"
---

通过教学漫画说明 Zed 的 Staged/Unstaged 分组、Stage、Unstage、Commit Tracked 与 Stash，不带入真实项目上下文。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

我更习惯按 Stage 和 Unstage 管理一次提交：先挑选改动，检查暂存内容，再 Commit。Zed 的 Git 面板也可以按这个习惯来读，把 Group By 设为 `Staged & Unstaged`。上面看这次准备交什么，下面看还有什么留着继续改。

想先看工作区、暂存区、本地仓库与远端仓库之间的整体流程，可以从[Git 闯关记：从工作区到远端仓库的完整漫画](/blog/ac4b7b1f6e887fab)读起，再回到这里对照 Zed 面板操作。

![封面：漫画读懂 Zed Git 面板，Stage、Unstage 与 Stash](/media/eaa9d6fbf7fa29ec-682a83482517f860.webp)

漫画里的黄色“提交篮”代表暂存区。**Stage 把当前改动选入篮里，Unstage 取消暂存并保留修改，Commit 把篮里的版本记入本地历史。** Stash 则把未完成的改动临时寄存。文件一直留在项目原路径，漫画中的收放只是帮助理解。

## 第一话：先把面板设成 Staged / Unstaged

![第一话漫画：真实设置截图勾选 List、Name 与 Staged & Unstaged；Unstaged 是未暂存改动，Staged 是准备提交的内容](/media/eaa9d6fbf7fa29ec-f5ecf31f74f90b07.webp)

设置截图中带勾的是 `View → List`、`Sort By → Name`、`Group By → Staged & Unstaged`：文件平铺、按文件名排序，再按暂存状态分组。View 和 Sort By 调整显示方式，Group By 决定分组依据；切换设置不会执行 Stage。[Zed 显示与分组实现](https://github.com/zed-industries/zed/blob/7f9a39a9c08373dcc62599906f8dc335d358d7c4/crates/git_ui/src/git_panel.rs)

这套分组先回答一个日常问题：**本次提交已经选了哪些改动，还有哪些没选？** Tracked / Untracked 属于另一个维度，解释 `Commit Tracked` 时再补充。

## 第二话：7 个文件都在 Unstaged，先挑本次要交的

![第二话漫画：真实截图有7个未暂存文件；教学示例只Stage其中3个，余下4个保留在Unstaged](/media/eaa9d6fbf7fa29ec-fead3dd8f411fc42.webp)

你的截图里，`Staged` 显示 `No staged changes yet`，`Unstaged` 右侧是 7，顶部主按钮是 `Stage All`。这表示当前有 7 个变更文件，暂存区还没有选入内容；`+101 / −15` 是增加、删除的行数。

展开 Unstaged，看 Diff，然后 Stage 目标文件。只想交一个文件中的部分改动，就在 Diff 中按 hunk 选择；确认全部改动属于同一次提交时，再用 Stage All。[Zed 暂存操作说明](https://zed.dev/docs/git#staging-workflow)

后续漫画假设这 7 个文件中，本次完整暂存 3 个、留下 4 个，且暂存后尚未继续编辑。**3 和 4 是教学示例，不是从截图推断的操作记录。**

## 第三话：选多了就 Unstage，修改仍然保留

![第三话漫画：Unstage取消目标文件的暂存，Unstage All全部取消暂存，工作区编辑结果继续保留](/media/eaa9d6fbf7fa29ec-b98f633d3be8b715.webp)

对目标文件执行 Unstage，它的改动会回到未暂存状态；要全部重新挑选，就执行 Unstage All，再 Stage 这次真正要交的部分。工作区里的编辑结果继续保留。Unstage 不会撤销已有 commit；Restore / Discard 才涉及按作用范围丢弃修改，执行前要看目标与确认提示。[Git restore：暂存区与工作区的恢复范围](https://git-scm.com/docs/git-restore)

顶部按钮写的是“下一步动作”。只要还有未暂存改动，主按钮仍可能显示 Stage All；全部暂存后才会切为 Unstage All。要判断当前选了什么，直接看 Staged 及其 Diff。[Zed 主按钮切换实现](https://github.com/zed-industries/zed/blob/7f9a39a9c08373dcc62599906f8dc335d358d7c4/crates/git_ui/src/git_panel.rs)

## 第四话：Stage 后又继续改，同一文件会出现在两组

![第四话漫画：Stage版本A后继续编辑成B，同一文件同时有Staged与Unstaged改动，Commit提交已暂存的A](/media/eaa9d6fbf7fa29ec-17714b9df51f3538.webp)

Stage 保存操作当时的版本。把版本 A 暂存后，继续编辑成 B，暂存区仍记着 A。此时 Staged 展示 A 相对 HEAD 的改动，Unstaged 展示 B 相对 A 的后续改动。同一文件名可能同时出现在两组，所以不能把两组数量简单相加，当作不同文件的总数。[Git：暂存后继续编辑](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)

如果本次只交 A，保留现有暂存；要把 B 的后续改动一起交，再 Stage 对应内容。提交前检查 Staged Diff，确认实际选入的版本。

## 第五话：检查 Staged，再 Commit；留意 Commit Tracked

![第五话漫画：有暂存内容时Commit提交选中版本，暂存区为空时Commit Tracked会自动暂存并提交tracked改动](/media/eaa9d6fbf7fa29ec-541742fe9695a942.webp)

有暂存内容时，普通 `Commit` 提交已暂存版本。填写提交说明、检查 Staged Diff，再提交；示例中留下的 4 个文件继续处于未暂存状态。Commit 生成本地历史记录，需要同步到远端时，再执行 Push。[Zed 提交说明](https://zed.dev/docs/git#committing)

截图底部却写着 `Commit Tracked`，因为当前暂存区为空。这个入口会自动暂存并提交 tracked 改动。Tracked 表示 Git 已经跟踪的文件；它们仍可能有未暂存修改。尚未跟踪的新文件需要先 Stage，才会进入提交范围。[Zed 面板暂存工作流](https://zed.dev/docs/git#using-the-git-panel)

因此，**Unstage All 之后直接点 Commit Tracked，并不能排除刚才取消的文件**：Zed 又会自动暂存 tracked 改动后提交。只交一部分时，先明确 Stage 目标内容，确认按钮显示 Commit，再检查暂存 Diff。[Zed 提交按钮条件与实现](https://github.com/zed-industries/zed/blob/7f9a39a9c08373dcc62599906f8dc335d358d7c4/crates/git_ui/src/git_panel.rs)

## 第六话：临时换任务，用 Stash 寄存未完成的改动

![第六话漫画：Stash All与Stash Staged按范围寄存，View Stash检查内容，Pop成功后移除条目，Apply保留条目](/media/eaa9d6fbf7fa29ec-bc505f577c3913ea.webp)

在 `Staged & Unstaged` 分组下，菜单会提供 `Stash Staged`。它与 Stash All 的区别在于收纳范围；Stash Staged 需要 Git 2.35 或更新版本。[Zed Stash 说明](https://zed.dev/docs/git#stashing)

| 入口 | 保存或取回什么 | 操作后留意什么 |
| --- | --- | --- |
| Stash All | 已暂存、未暂存，以及未被忽略的新文件 | 通常不收纳仍未跟踪且被忽略的文件 |
| Stash Staged | 仅已暂存部分 | 未暂存部分留在工作区，不保证工作区变干净 |
| View Stash | 查看寄存列表与 Diff | 先确认要取回哪一条 |
| Stash Pop | 默认应用最近一条，成功后移除条目 | 冲突时条目通常保留，先处理冲突 |
| Apply | 应用选中的寄存内容，保留条目 | 后续可再次查看或自行删除条目 |

取回后重新检查 Diff 和暂存状态，不能假设 Zed 的 Pop 会恢复原来的 Staged / Unstaged 划分。Stash 不会随普通 Push 同步，也不能代替远端备份。[Git stash 手册](https://git-scm.com/docs/git-stash)、[Zed Pop 实现](https://github.com/zed-industries/zed/blob/7f9a39a9c08373dcc62599906f8dc335d358d7c4/crates/git/src/repository.rs#L2513)

## 日常就按这套顺序操作

先看 Unstaged Diff，Stage 本次改动，再检查 Staged Diff、填写说明并 Commit。要重新挑选时用 Unstage；未完成却要临时换任务时用合适范围的 Stash。

| 想做什么 | 对应操作 |
| --- | --- |
| 选入本次提交 | Stage 文件或 hunk；全部都要交才 Stage All |
| 取消本次选择，编辑结果留着 | Unstage / Unstage All |
| 把选好的版本记入本地历史 | Commit |
| 临时收起未完成的改动 | Stash All / Stash Staged |
| 确认不要某些修改 | 核对范围后 Restore / Discard |
| 同步本地提交到远端 | Push |

本文以两张真实截图为界面依据，配合教学示例解释操作；没有对截图中的仓库执行暂存、提交或寄存。行为核对于 2026 年 10 月 29 日，参考 Zed 官方文档及固定版本源码；截图未显示安装版本号，具体菜单以当前版本为准。
