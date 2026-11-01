---
id: "ac4b7b1f6e887fab"
title: "Git 闯关记：从工作区到远端仓库的完整漫画"
description: "用工作桌、背包与档案塔的漫画，解释 Stage、Commit、Push、Fetch、Stash 和 Worktree 各自推进的边界。"
date: "2026-10-29"
topic: "principles"
tags: ["Git","漫画","版本管理","Stash","Worktree"]
collection: "docs"
cover: "/media/ac4b7b1f6e887fab-dcb44ab0efb6ff37.webp"
---

用工作桌、背包与档案塔的漫画，解释 Stage、Commit、Push、Fetch、Stash 和 Worktree 各自推进的边界。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

代码保存了，Stage 也点过了，为什么同事还看不到？临时要修一个问题，半成品该先收起来，还是另开一个目录？这些操作放回同一张地图，就能看清各自解决什么问题。

![封面：Git 闯关记，橙衣冒险者从工作浮岛望向远端城堡](/media/ac4b7b1f6e887fab-dcb44ab0efb6ff37.webp)

这篇漫画用工作桌、背包、档案塔和团队城堡表示 Git 中的不同状态，跟随冒险者“小橙”完成一天开发。**主线是工作区、暂存区、本地仓库、远端仓库；Stash 和 Worktree 是临时换任务时的两条支线。**

## 闯关地图：先认清四个区域与两条支线

*（此版本省略该配图。）*

| 漫画里的地点 | Git 中对应什么 | 保存什么 |
| --- | --- | --- |
| 工作桌 | Working tree，工作区 | 当前检出的文件与正在编辑的内容 |
| 背包 | Index / Staging area，暂存区 | 准备放入下一次提交的版本 |
| 本地档案塔 | Local repository，本地仓库 | 本地对象、提交历史与分支引用 |
| 团队城堡 | Remote repository，远端仓库 | 推送到远端的对象与分支引用 |

前三个区域都在本机这一侧，是不同职责，不要求建立三个独立文件夹。漫画中的“装包”“送达”表示记录和传递版本；Stage 后，项目文件仍在原路径。[Git add 手册](https://git-scm.com/docs/git-add)、[Git commit 手册](https://git-scm.com/docs/git-commit)

故事假设项目已经 clone 到 `project`，远端名为 `origin`，主线叫 `main`，小橙正在 `feature/search` 分支开发。命令中的分支、文件和目录都是教学示例；两条急修支线按需要选择，不是要求依次执行的脚本。

## 第一话：工作区里改好了，先看看改了什么

![第一话漫画：编辑搜索文件并保存，用 git status 和 git diff 查看工作区改动](/media/ac4b7b1f6e887fab-79b7794d712bd16c.webp)

小橙给 `src/search.ts` 加了搜索能力，又留下几行临时调试。文件保存到磁盘后，这些都属于工作区变化。`git status --short` 看文件状态，`git diff` 看未暂存的内容变化；新的未跟踪文件会出现在 status 中，普通 diff 不会直接展示它的正文。

本次只准备提交搜索能力，调试改动留着继续处理。先看 Diff，再决定 Stage 的范围。

## 第二话：Stage 装入本次版本，Unstage 取消选择

![第二话四格漫画：Stage 选择内容，Unstage 保留工作区编辑，暂存 A 后继续编辑 B，提交前检查暂存 Diff](/media/ac4b7b1f6e887fab-393dbb47a9101f70.webp)

`git add src/search.ts` 暂存整个文件当时的内容；`git add -p` 可以逐块选择。选多了，用 `git restore --staged src/search.ts` 取消暂存，工作区里的编辑结果仍然保留。[Git add](https://git-scm.com/docs/git-add)、[Git restore](https://git-scm.com/docs/git-restore)

Stage 记下当时的版本 A，之后继续编辑成 B，暂存区仍保存 A。此时 `git diff --cached` 看 A 相对 HEAD 的变化，`git diff` 看 B 相对 A 的后续变化。同一文件可以同时有 staged 和 unstaged 改动。

```bash
# 确认这一次将提交什么
git diff --cached

# 需要重新挑选时，取消该文件的暂存
git restore --staged src/search.ts
```

## 第三话：Commit 把背包里的版本留在本地历史

![第三话漫画：Commit 根据暂存区生成本地提交，未暂存的后续修改仍在工作区](/media/ac4b7b1f6e887fab-5fa0d41e73874300.webp)

检查暂存 Diff 后，小橙执行 `git commit -m "feat: add search"`。普通 commit 使用暂存区形成项目快照，并记录作者、说明和父提交等信息；它不是把磁盘上所有刚改过的内容都自动收进去。[Git commit 手册](https://git-scm.com/docs/git-commit)

如果背包里选的是 A，桌上已经编辑成 B，本次提交记下 A，后续变化继续留在工作区。`git log --oneline` 能看到新提交，远端仓库还没有因此更新。

## 第四话：Push 把本地提交交给远端

![第四话漫画：将 feature/search 推送到远端，团队能取回提交，但未提交的半成品不会随 Push 同步](/media/ac4b7b1f6e887fab-f2ec2d322611b3f7.webp)

小橙执行 `git push -u origin feature/search`，把功能分支送到远端，并建立上游关系。后续在这个分支上，通常可以直接 `git push`。[Git push 手册](https://git-scm.com/docs/git-push)

Push 更新的是远端引用及其所需对象。未提交的工作区修改、仅暂存的内容、stash 条目，都不会随普通 Push 自动同步。远端出现 `feature/search`，也不表示它已经合入 `main`；评审和合入是接下来的团队步骤。

## 第五话：队友也在改，Fetch 取回，整合再另做

![第五话漫画：Fetch 取回远端历史并更新远端跟踪引用，需要时再合并；Pull 包含取回与整合两个阶段](/media/ac4b7b1f6e887fab-b12e00f0d0781392.webp)

队友更新了 main。小橙先 `git fetch origin`，更新本地的 `origin/main` 等远端跟踪引用，再查看新提交。Fetch 不会自动把这些提交合入当前 `feature/search`，工作区也不会因为这次取回就自动完成整合。[Git fetch 手册](https://git-scm.com/docs/git-fetch)

`git pull` 会先 fetch，再按参数与配置整合选定分支；无参数时通常使用当前分支的上游。只接受快进更新可以明确使用 `git pull --ff-only`，分叉时它会停下来。它与“把 main 合入功能分支”不是同一条固定指令。本故事选择先 fetch，再明确执行 `git merge origin/main`。[Git pull 手册](https://git-scm.com/docs/git-pull)

真正整合前，先把当前任务提交或妥善寄存。若两边修改了同一处，可能需要处理冲突；小橙会在第八话完成这一步。

## 第六话 · 支线 A：Stash 先收起半成品，回来再继续

![第六话漫画：Stash 将未完成改动临时存入本地宝箱，回到原分支后查看并 Pop；成功后移除条目](/media/ac4b7b1f6e887fab-e1c0f78cb935b1b4.webp)

搜索又写了一半，临时来了急修。同一张工作桌需要切换任务，小橙先把半成品寄存：

```bash
git stash push -u -m "WIP search"
git fetch origin
git switch -c fix/urgent origin/main

# 完成急修、提交并按团队规则推送后，回来继续搜索
git switch feature/search
git stash list
git stash show -p --include-untracked
git stash pop
```

普通 `git stash push` 默认不收未跟踪文件，`-u` 把它们一并收纳，忽略文件仍默认留着。Pop 成功应用后移除条目；发生冲突时保留条目，先解决冲突，再决定是否删除。Apply 取回内容但保留条目。[Git stash 手册](https://git-scm.com/docs/git-stash)

取回后要重新检查暂存状态：普通 Pop 不保证恢复原来的 Stage 划分；`--index` 会尝试恢复，但也可能因冲突失败。Stash 是本地临时收纳，不是当前分支的一次正式提交，也不会随普通 Push 同步。

## 第七话 · 支线 B：Worktree 开第二张桌，保留原来的现场

![第七话漫画：两个目录各有工作区、暂存区与 HEAD，共享本地仓库历史；在新目录检出急修分支，原任务保持不动](/media/ac4b7b1f6e887fab-64ceb8ebc604fa2d.webp)

另一种选择是保留搜索工作区，另开目录处理急修。下面替代第六话的 Stash 路径，仍从“原目录在 feature/search，急修分支尚未创建”开始：

```bash
git fetch origin
git worktree add -b fix/urgent ../project-fix origin/main
git worktree list
```

原目录继续停在 `feature/search`，新目录 `../project-fix` 检出 `fix/urgent`。两边有各自的工作区、index 和 HEAD，共享仓库对象与多数引用；原目录的未提交修改不会自动出现在新目录里。同一分支默认不能同时检出到两个 worktree。[Git worktree 手册](https://git-scm.com/docs/git-worktree)

`git worktree add -b fix ../fix` 省略了起点，默认从当前 HEAD 建分支。急修通常需要主线版本，所以这里先 fetch，再明确指定 `origin/main`。

新目录完成提交、推送并确认没有要保留的未提交内容后，从其他 worktree 执行 `git worktree remove ../project-fix`。移除目录不会自动删除本地分支；确认不再需要后，再按合并状态清理分支。

## 第八话：回到主线，解决冲突并完成团队交付

![第八话漫画：提交自己的成果后整合 main，手工解决冲突、Stage 并完成合并提交，随后推送功能分支并进入评审](/media/ac4b7b1f6e887fab-e5adc433148f1ce1.webp)

急修结束，搜索功能也完成了。小橙先检查并 commit 自己的成果，使工作区适合整合，然后 fetch 最新历史并 merge main。若出现冲突，Git 会标记需要确认的位置：编辑出正确结果、移除冲突标记、运行项目检查，再 add 解决后的文件并完成合并提交。[Git merge 手册](https://git-scm.com/docs/git-merge)

```bash
# 已经提交自己的成果，并确认当前状态适合合并
git fetch origin
git merge origin/main

# 仅在发生冲突、已编辑解决并通过检查后执行
git add src/search.ts
git commit
git push
```

最后，按团队规则通过 PR/MR 或命令行合入 main。队友再取回并更新自己的分支，才能在自己的工作区看到新成果。**功能分支已推送、代码已合入主线、应用已发布，是三个不同状态。**

## 走错一步时，先判断要保留什么

| 当前目的 | 操作 | 保留与改变的范围 |
| --- | --- | --- |
| 取消暂存，编辑结果留着 | `git restore --staged 文件` | index 默认回到 HEAD，工作区修改保留 |
| 丢弃已跟踪文件的未暂存修改 | `git restore -- 文件` | 工作区恢复为 index 中的内容；会丢弃对应编辑 |
| 临时收起未完成任务 | `git stash push -u` | 保存相应改动；未跟踪的忽略文件默认不收 |
| 保留原现场并行工作 | `git worktree add ...` | 新增独立工作区，原任务不自动迁移 |
| 撤销一个已共享提交的效果 | `git revert 提交号` | 通过新的反向提交记录撤销，可能需要解决冲突 |

`restore` 的默认来源取决于目标是否含 `--staged`，不要把“取消暂存”和“丢弃编辑”当成同一操作；`revert` 则针对历史提交，记录一条新的反向提交。[Git restore](https://git-scm.com/docs/git-restore)、[Git revert](https://git-scm.com/docs/git-revert)

## 回到编辑器，仍然先看这次准备提交什么

在 Zed 中，可以继续用 `Staged & Unstaged` 分组：先看 Unstaged，Stage 本次改动，再检查 Staged Diff、填写说明并 Commit。面板中的 `Commit Tracked` 还有自动暂存已跟踪改动后提交的行为，具体看配套的[漫画读懂 Zed Git 面板：Stage、Unstage 和 Stash](/blog/eaa9d6fbf7fa29ec)。

遇到“改了但别人看不到”，先确认有没有 commit、有没有 push、推到了哪个分支；临时换任务时，按是否需要保留原现场，在 Stash 和 Worktree 之间选择。把改动所在的位置看清，下一步操作就有了依据。

分话插画沿用读者提供的 Git 流程漫画的冒险场景重新创作，故事、人物和文件名都是教学设定。原稿记载的命令语义核对时间为 2026 年 10 月 29 日；本公开版保留教学步骤，不将原稿中的执行记录当作本次重新验收。
