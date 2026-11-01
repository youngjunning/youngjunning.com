---
id: "4b9bf67b18e64c4e"
title: "Codex 到底改了哪里：从两个并发会话讲清 Worktree、暂存区、Commit 与 Origin"
description: "以明确标注的教学模型，区分工作区、暂存区、本地提交、远端和 linked worktree；真实仓库、时间与提交标识不进入本版本。"
date: null
topic: "principles"
tags: ["构建"]
collection: "docs"
cover: "/media/4b9bf67b18e64c4e-59dddf6f3aea5208.webp"
---

以明确标注的教学模型，区分工作区、暂存区、本地提交、远端和 linked worktree；真实仓库、时间与提交标识不进入本版本。

> 本文把原案例抽象为教学模型；文件、时间、版本、提交符号与变更范围均不对应真实仓库，不作为真实交付记录。

一次全局 BUILD 状态栏修复完成后，Codex 的汇报里出现了两句话：“暂存区只有本次 footer 改动”和“源码已推送到 `origin/main`”。这两个词都属于 Git，但很容易被理解成 Codex 在两个不同目录里工作：有时进入“暂存区”，有时进入 “worktree”，最后再把文件送到一个叫 origin 的地方。

在这个示例中同一个 示例项目 仓库里恰好还有另一个 Codex 会话在修 Windows Setup 图标。两个会话一度同时触碰 `build/cache.json`，最终却形成了两个边界清楚的 commit，没有把状态栏与图标修复混在一起。这个过程比抽象定义更能说明 Codex 与 Git 的真实关系。

![Codex 与 Git 并发工作封面](/media/4b9bf67b18e64c4e-59dddf6f3aea5208.webp)

## 一句话总结

Codex 默认编辑的是当前 checkout 的 **working tree**。暂存区（index）不是另一个工作目录，而是“下一次 commit 准备记录哪些文件内容”的快照；commit 保存在本地 Git 仓库；`origin` 是远端仓库的别名，`origin/main` 则是本地保存的远端分支跟踪引用。

一条最常见的状态流可以压缩成下面四层：

| 层 | Git 中的对象 | Codex 在这一层做什么 | 常用检查 |
| --- | --- | --- | --- |
| 1 | Working tree | 修改、创建或删除真实文件，运行测试 | `git status --short`、`git diff` |
| 2 | Index / staging area | 选择下一次 commit 要包含的文件或 hunk | `git diff --cached` |
| 3 | Local commit | 把 index 固化为不可变快照，更新当前 branch | `git show HEAD`、`git log` |
| 4 | Remote | 把本地 commit 推送到远端仓库 | `git push origin main` |

Codex 并不会在 index 里持续开发。正常顺序始终是先修改 working tree，再在交付边界明确时执行 `git add`。当汇报写“暂存区只有本次改动”，它表达的是 commit 范围已经核对，并不是代码曾在一个名为“暂存区”的目录中运行。

![Codex 修改从 Working tree 经 Index、Local commit 到 origin 的四层 Git 状态流](/media/4b9bf67b18e64c4e-6776b32fcca2409e.webp)

这张图里最容易被忽略的是箭头：`git add`、`git commit`、`git push` 推进的是三个不同边界。少执行一步，代码所处的交付状态就不同；多汇报一步，则会把本地事实说成远端或发布事实。

## 两个并发会话具体发生了什么

在教学模型中，示例项目 仓库同时存在两项工作：

| 会话 | 目标 | 主要文件 |
| --- | --- | --- |
| 会话 A | 修复长终端会话中 BUILD footer 消失、闪烁和光标争用 | `reporter.js`、构建工具 renderer、测试、文档 |
| 会话 B | 修复 Windows Setup 图标 resource 路径 | `app_resources.rc`、assemble 测试、上游依赖测试、构建工具 缓存 |

两个任务都需要更新 `build/cache.json`。这类生成型缓存把多个输入的 size、hash 和总摘要放在同一个文件里，因此“两个任务修改了同一个文件”不代表它们应该进入同一个 commit。

教学模型中的状态顺序如下：

| 步骤 | Git 事实 | 含义 |
| --- | --- | --- |
| 1 | 会话 B 从 `BASE` 创建 `feature/app-icon` | 图标修复获得独立 branch / linked worktree 边界 |
| 2 | 会话 A 在 `main` 提交 `A1` | footer 的 所选文件形成独立 commit |
| 3 | 会话 B 提交最初的图标修复 `B1` | 图标修复先基于旧起点完成快照 |
| 4 | 会话 B rebase 到 `A1`，形成 `B2` | 图标修复重新接在 footer commit 之后 |
| 5 | 主 `main` fast-forward 到 `origin/main` | 两个 commit 顺序进入共享分支，历史保持线性 |

最终历史是：

```text
BASE  base snapshot
    |
A1  fix(cli): keep build footer pinned
    |
B2  fix(windows): resolve setup icon resource
```

这里最值得关注的不是两个 commit ID，而是两个交付边界：会话 A 没有把会话 B 的图标改动带入 footer commit；会话 B 也没有覆盖已经进入分支的 footer 修复。rebase 解决的是提交基线变化，index 解决的是单次提交范围，linked worktree 解决的是文件与 branch 的执行空间隔离。三个机制分工不同。

![两个 Codex 并发会话从共同基线分支，经 rebase 与 fast-forward 收敛为线性 Git 历史](/media/4b9bf67b18e64c4e-1708006ef135ca5e.webp)

图中的 `B1` 与 `B2` 内容目标相同，但 commit ID 不同，因为 rebase 会在新父 commit 上重新创建快照。这里发生的不是“把旧 commit 搬了个位置”，而是用新的父子关系重写了会话 B 的本地历史。

## Codex 实际编辑的是 Working Tree

Working tree 是 checkout 后在磁盘上看到的文件集合。Codex 使用 `apply_patch` 修改 `src/build-status.js`，或新增一篇 `docs/*.md`，变化首先都出现在这里。

此时运行：

```bash
git status --short
git diff
```

可以看到尚未暂存的变化。测试、构建、编辑器和语言服务默认读取的也都是 working tree，而不是 index。这一点在并发会话里尤其重要：即使准备提交的 staged diff 很干净，直接运行 `pnpm build` 仍可能读到另一个会话留下的 unstaged 文件。

footer 会话的根项目 build 就属于这种情况。当时图标修复仍在共享 working tree 中，所以 build 成功只能证明“当前整个工作目录可以构建”，不能独立证明 footer commit 的 所选文件构建成功。针对 日志模块 和 构建工具 的定向测试更接近本次变更边界；如果必须验证 commit 的精确快照，应在干净 linked worktree 或导出的 commit tree 中执行。

这也是为什么工程汇报需要区分：

| 证据 | 实际证明了什么 |
| --- | --- |
| 当前目录 build 通过 | working tree 的组合状态可以构建 |
| staged diff 检查通过 | 下一次 commit 的选择边界正确 |
| commit 上的 CI 通过 | 该 commit 快照通过对应 CI |
| 目标平台验收通过 | 指定 commit 或制品在目标平台行为正确 |

“测试通过”如果没有说明测试读取了哪一层，就可能比证据本身更强。

## 暂存区不是目录，而是下一次 Commit 的候选快照

Git index 通常被翻译成“暂存区”或 staging area。它记录的是路径及其准备提交的内容，不需要、也通常不存在一个供 Codex 打开的独立目录。

执行：

```bash
git add src/build-status.js
```

只是把该文件此刻的内容写入 index。继续编辑同一个文件后，working tree 会再次变化，而 index 仍保留 `git add` 时的版本。因此同一路径可以同时有 staged 和 unstaged 两份差异。

`git status --short` 的两列正是用来表达这种状态：

| 显示 | 第一列：index | 第二列：working tree | 含义 |
| --- | --- | --- | --- |
| `M ` | 已修改 | 无额外修改 | 只有 staged 版本 |
| ` M` | 未暂存 | 已修改 | 只有 working tree 版本 |
| `MM` | 已修改 | 又被修改 | staged 后，同一路径还有新变化 |
| `A ` | 已新增 | 无额外修改 | 新文件已进入 index |
| `??` | 不适用 | 未跟踪 | Git 尚未开始跟踪该文件 |

两个 示例项目 会话并发时，`build/cache.json` 一度显示 `MM`。会话 A 只把 构建工具 `status.js` 对应的缓存 hunk 放进 index；图标路径与总摘要的另一个 hunk仍留在 working tree。会话 A 随后执行的 commit 只读取 index，于是 footer commit 得到自己需要的缓存变化，图标变化没有被误带进去。

![同一文件通过 git add -p 将 footer hunk 放入 Index，同时让 Setup icon hunk 留在 Working tree](/media/4b9bf67b18e64c4e-f2c6f6ed095ff398.webp)

因此，`MM` 不是“同一个文件被改了两次”这么简单。它更准确地表示：该路径在 index 中已有一个候选版本，而磁盘上的 working tree 又相对这个候选版本发生了变化。两列 `M` 分别属于两个比较方向。

这类场景适合使用交互式暂存：

```bash
git add -p build/cache.json
git diff --cached -- build/cache.json
git diff -- build/cache.json
```

第一条按 hunk 选择内容；第二条查看将进入 commit 的版本；第三条查看仍留在 working tree 的版本。Codex 在共享 dirty checkout 中说“核对暂存区”，通常就是在完成这组边界检查。

## Commit 只读取 Index，不会自动收走整个目录

`git commit` 创建的是 index 的快照，并让当前 branch 指向这个新 commit。没有进入 index 的修改会继续留在 working tree。

会话 A 提交 `A1` 后，Git 记录了 已选择的状态栏变更。Setup 图标涉及的 相关文件当时仍可继续由会话 B 处理。这个结果依赖“精确暂存”，而不是依赖 commit 自动理解哪个改动属于哪个任务。

因此，共享仓库中最危险的快捷方式之一是没有检查就执行：

```bash
git add -A
```

它会把整个 working tree 中可见的修改都纳入 index，包括其他会话、编辑器或开发者留下的文件。仓库干净、任务单一时它很方便；存在并发工作时，应先用 `git status --short` 确认所有权，再按路径或 hunk 暂存，并在 commit 前检查：

```bash
git diff --cached --name-only
git diff --cached --check
git diff --cached
```

Codex 是否执行 `git add`、`git commit` 和 `git push`，取决于用户请求与仓库里的 `AGENTS.md`。只要求诊断时，不应因为看到了问题就提交；要求实现但没有交付 Git 状态时，可以停在 working tree；明确要求完成、提交、推送，或项目规则把 Git 交付设为任务门禁时，才继续推进后面的生命周期。

## Worktree 有两个常见含义

工程讨论里说“worktree”，经常混合了两个概念。

每个 Codex 会话都有一个当前工作目录（`cwd`），它决定该会话读写哪个 checkout。两个会话的 `cwd` 指向同一路径时，会共享同一套文件与 index；一个会话改完文件，另一个会话立即可见。只有把会话放到不同 linked worktree，文件目录、HEAD 与 index 才彼此隔离。

第一种是 working tree，指当前 checkout 的真实文件。每个普通 Git 仓库至少有一个，也是 Codex 默认编辑的位置。

第二种是 `git worktree` 创建的 linked worktree。它是一套额外 checkout，拥有独立的文件目录、HEAD 和 index，但共享同一个 Git object database、refs 与 remotes。例如在这个示例中的图标会话使用了：

```text
主 working tree
<WORKTREE_A>
branch: main

linked worktree
<WORKTREE_B>
branch: feature/app-icon
```

![Git linked worktree 共享 object database、refs 与 remotes，同时隔离 files、HEAD 与 Index](/media/4b9bf67b18e64c4e-8eebef1e32d1e243.webp)

这里的“共享仓库”与“独立工作区”可以同时成立：两个 checkout 能看到相同 commit、branch 和 remote，但各自拥有可独立编辑、暂存和检出的文件状态。也正因为 index 是隔离的，一个 worktree 中的 `git add` 不会改变另一个 worktree 下一次 commit 的候选快照。

linked worktree 适合以下情况：

1. 主目录已经有其他任务的未提交变化；
2. 两个会话要同时操作不同 branch；
3. 需要在干净快照上构建、rebase 或发布；
4. 不希望通过 stash 暂时搬走另一个人的工作。

它不是“更高级的暂存区”。每个 linked worktree 仍然有自己的 working tree 和 index，仍然遵循 edit、stage、commit、push 的顺序。创建 linked worktree 解决空间隔离，`git add -p` 解决单个 commit 的内容选择，两者可以同时使用。

## Origin 到底是什么

`origin` 只是一个 remote 名称。Git clone 默认把克隆来源命名为 `origin`，但这个名称可以改，也可以同时存在 `upstream`、`company` 等其他 remote。它既不是“原始 commit”，也不是某个固定 branch。

当前 示例项目 checkout 的 `origin` 指向团队远端仓库。执行：

```bash
git remote -v
```

可以查看名称与 fetch/push 地址。命令：

```bash
git push origin main
```

表示把本地 `main` branch 推送到名为 `origin` 的远端。它不等于部署、npm 发布或 ATA 页面同步，只完成 Git remote 这一层。

`origin/main` 又是什么？它是本地的 remote-tracking branch，表达“本地最后一次获知的 origin 上 `main` 位于哪个 commit”。`git fetch`、`git pull` 和成功的 push 等网络操作会更新相关远端跟踪信息；长时间不 fetch 时，它可能落后于服务器真实状态。

下面几个名字承担不同职责：

| 名称 | 指向什么 |
| --- | --- |
| `HEAD` | 当前 checkout 的 commit，通常通过当前 branch 间接指向 |
| `main` | 本地 branch，可以继续 commit |
| `origin` | 远端仓库别名 |
| `origin/main` | 本地保存的远端 `main` 已知位置 |

当下面两个命令输出相同 hash：

```bash
git rev-parse HEAD
git rev-parse origin/main
```

只能证明当前 checkout 与本地已知的远端跟踪位置一致。它不证明 package 已发布、CDN 已刷新、Windows 安装器已签名或 ATA 页面已上线。Git 同步是交付链中的一层，不是所有后续状态的代称。

## 为什么两个会话最后没有互相覆盖

这次并发处理成立，依赖四条具体约束。

第一，会话 A 在修改、暂存和提交前反复检查 `git status`，没有把 dirty worktree 当成自己的独占空间；会话 B 则建立了独立 branch / linked worktree。

第二，会话 A 使用按 hunk 暂存，只把 footer 对应的 构建工具 cache 变化放进 index；提交前又用 `git diff --cached --name-only` 和 `git diff --cached --check` 核对边界。

第三，会话 B 使用独立 branch / linked worktree 形成图标 commit，并在发现基线新增 `A1` 后 rebase，而不是覆盖主 branch。

第四，主 branch 最终通过 fast-forward 前进。历史顺序明确，没有 force push，也没有用 reset 清除另一个会话的状态。

这四条规则可以压缩成一个适用于 Coding Agent 的协作协议：

| 时机 | 应做什么 | 要避免什么 |
| --- | --- | --- |
| 开始任务 | 检查 branch、HEAD、origin 与 status | 假设目录干净或独占 |
| 修改代码 | 默认只改 working tree | 提前把全部文件加入 index |
| 发现并发变化 | 识别文件所有权，必要时创建 linked worktree | stash、reset 或覆盖未知改动 |
| 准备 commit | 按路径或 hunk 暂存，检查 cached diff | 无检查执行 `git add -A` |
| 基线前进 | fetch 后 rebase 或 fast-forward | force push 覆盖远端历史 |
| 汇报交付 | 分开陈述 working tree、staged、commit、push、发布与验收 | 用“完成”代替全部生命周期状态 |

## 怎样判断 Codex 当前停在哪一层

不需要依赖 Codex 的自然语言描述，直接读取 Git 即可：

```bash
# 1. 当前有哪些 staged、unstaged 和 untracked 文件
git status --short

# 2. working tree 相对 index 改了什么
git diff

# 3. 下一次 commit 将包含什么
git diff --cached

# 4. 当前 checkout 与远端已知位置
git rev-parse HEAD
git rev-parse origin/main

# 5. 是否存在其他 linked worktree
git worktree list
```

如果 `git diff` 有内容而 `git diff --cached` 为空，Codex 只改了 working tree。若 cached diff 有内容，说明下一次 commit 的候选快照已经形成。若 `git log -1` 出现新 commit，变更已经进入本地历史。只有远端 branch 的 hash 也前进，才能说 push 完成。

## 我的判断：把 Staging 当成提交防火墙

暂存区最有价值的场景不是“先存一下，晚点再说”，而是在多人、多 Agent 或多任务共享仓库时，为一次 commit 建立可检查的内容边界。它允许同一个 working tree 暂时容纳多项工作，同时只把经过确认的路径和 hunk 固化进历史。

但 index 不能替代真正的执行隔离。测试和构建读取 working tree；两个会话同时编辑同一文件时，仍可能发生覆盖或证据污染。任务持续时间长、改动范围交叉或需要精确构建时，应使用独立 linked worktree，并在 commit 前继续检查各自的 index。

因此，Codex 与 Git 的合理分工是：working tree 承载编辑，index 建立 commit 边界，local branch 组织历史，origin 负责共享，linked worktree 隔离并发执行空间。理解这五个对象后，“Codex 现在改到哪一步”就不再依赖猜测，而可以用一组明确的 Git 状态验证。
