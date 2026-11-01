---
id: "b87d8194f260201f"
title: "16-Pref、Policy、Feature Flag 与 Variations：同一份 Chromium 为什么表现不同"
description: "从源码阅读入口、进程边界与验证条件理解Pref、Policy、Feature Flag 与 Variations：同一份 Chromium 为什么表现不同。"
date: null
topic: "principles"
tags: []
collection: "docs"
cover: "/media/b87d8194f260201f-a9578b962bc783ca.webp"
---

从源码阅读入口、进程边界与验证条件理解Pref、Policy、Feature Flag 与 Variations：同一份 Chromium 为什么表现不同。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

![Chromium effective configuration 封面](/media/b87d8194f260201f-a9578b962bc783ca.webp)

> 阅读坐标沿用原稿：Chromium `153.0.8010.37`，上游 commit `b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b`。本次同步未重新进行源码与目标平台运行时验收。

![Pref、Policy、Feature 与 Variations 的配置优先级](/media/b87d8194f260201f-66660a82f7dfc0d5.webp)

## 一句话结论

Pref、Policy、Feature Flag 与 Variations 分别表达用户/产品状态、组织约束、代码路径和实验分组；排查“同版本行为不同”时，必须重建最终 effective configuration，而不是只看默认值或单个开关。

“同一版本、同一页面，为什么 A 机器有按钮、B 机器没有？”在 Chromium 中不一定是代码分支没同步。一个可见行为可能同时受编译期条件、命令行、Feature Flag、field trial、enterprise policy、Profile pref、用户选择和系统能力影响。它们解决的问题不同，优先级也不同；把它们都叫“配置”，会让产品、排障和安全 review 失去边界。

先把问题分为三类：**用户可以选择什么、组织可以强制什么、当前二进制是否启用某项实验或能力。** Pref、Policy、Feature/Variations 分别主要对应这三件事。

## 四层开关并不在同一个所有权域

| 层次 | 主体 | 典型用途 | 不应拿来做什么 |
| --- | --- | --- | --- |
| build/GN 与平台条件 | 编译与目标平台 | 是否编入某实现、链接何种后端 | 运行时给个别用户灰度一项高风险能力 |
| Feature Flag / Field Trial | Chromium/Distribution 运行时配置 | 渐进启用、行为参数、实验分组 | 保存用户意愿或替代权限判断 |
| Pref | Profile/用户或产品默认设置 | 首页、内容设置、已确认的用户选择、局部持久化状态 | 绕过 enterprise policy 或当作跨 Profile 全局配置 |
| Enterprise Policy | 受管理组织/设备 | 强制、建议或禁止安全与产品行为 | 作为单个网页/Extension 的任意业务配置通道 |

此外命令行通常是开发、测试、受控启动的高优先级输入；它适合可复现试验，不适合成为面向用户发布行为的隐性控制面。系统 capability、权限和当前 document 身份也会继续限制最终结果。一个 feature enabled 并不能越过 sandbox、permission 或 policy。

```text
compiled implementation
  + command-line / FeatureList / field trial parameters
  + enterprise policy and managed pref precedence
  + Profile pref and user choice
  + current platform capability, permission, document state
  -> actual observable behavior
```

这是诊断模型，不代表每个功能都依次读取所有层。其价值在于避免“看到 pref 是 true，就宣布功能必然可用”或“FeatureFlag 已开，就忽略管理员禁用”的错误结论。

## Pref：一个可注册、可观察、有优先级的 Profile 状态系统

`components/prefs/pref_registry.*` 用于声明 pref 的名称、类型和默认值；`PrefService` 负责读写与观察；`PrefValueStore` 组织多个值来源的优先级。它不是一个随手读写的 JSON 文件：读到的 effective value 可能来自默认、用户、本机、受管理、命令行或其他 store，实际持久化与同步策略还由具体 Profile/service 决定。

| 概念 | 用来回答 | 不应假设 |
| --- | --- | --- |
| registered default | 未设置时行为是什么 | 每个 Profile 当前都会是默认值 |
| user pref | 用户/产品在该 Profile 保存了什么选择 | 它一定胜过 policy，或能写入 OTR 后长期保存 |
| managed/recommended pref | 管理员强制或建议的值 | UI 改动已永久生效 |
| observer | effective value 发生变化时如何响应 | 回调不需要考虑对象销毁、线程/sequence 或批量变化 |

新增 pref 前应先问：它的 owner 是哪个 BrowserContext/Profile，是否允许无痕使用，是否含敏感数据，谁能修改，如何迁移旧值，policy 是否需要覆盖，以及 value 变化要在什么 sequence 生效。把 Distribution branding、跨产品 release channel 或 Kernel ABI 版本塞入普通 user pref，会破坏可复现构建和产品身份；把一次网页请求的临时授权写入永久 pref，也会扩大本不应持久化的权限。

## Policy：一套受验证的管理契约

`components/policy/core/common/configuration_policy_provider.*` 提供 policy 来源，`PolicyService` 聚合并通知；`PolicyMap` 保存带 level、scope、source 等元信息的值，schema/handler 将有效 policy 映射到具体 browser 行为或 pref。`configuration_policy_handler.*` 和 browser policy connector 展示了 policy 不是“读取一段 JSON 后 if 一下”这么简单：它需要定义 schema、值验证、作用域、刷新和错误处理。

| 需求 | 更合适的机制 | 原因 |
| --- | --- | --- |
| 用户想记住“是否展示某个提示” | Profile pref | 是用户范围、可撤销的偏好 |
| 发行版需要固定默认主页或实验默认值 | Distribution Profile/明确的默认输入 | 应在发行构建和产品定义中可审计 |
| 企业必须禁止 remote debugging 或某类数据外发 | Policy + Browser enforcement | 需要受管理优先级与不可被页面绕过的边界 |
| 新内核路径逐步验证 | Feature + 参数/受控实验 | 需要可分组、可回收、可观测的运行时控制 |
| 网页请求摄像头 | permission / content setting | 要绑定当前 document、用户与设备上下文，不是通用开关 |

Policy 生效也不代表业务已经做好：仍需验证 managed state 在用户 UI、Extension、Runtime 与 native 行为上是否一致，以及 policy 刷新、撤销、Profile/OTR 和旧客户端升级后的迁移路径。

## Feature Flag：将“代码是否走这条路径”显式化

`base/feature_list.h` 定义 FeatureList 的核心接口，调用处常见 `base::FeatureList::IsEnabled(kFeature)`。Feature 本身通常有默认 enable/disable 状态，并可带参数；field trial 或命令行可对其覆盖。它适合保护尚在演进的实现、逐步扩大受众、比较两条实现路径，或在事故时快速停止某项非持久化行为。

但 Feature Flag 不能替代版本兼容和数据迁移。以下是常见的错误用法：

- 用 flag 让新旧网络/存储格式长期并行，却没有版本字段、迁移和回滚语义；
- 用 flag 隐藏一个已向网页/Extension 发布的 API，却没有明确的 unsupported/error contract；
- 用远端 flag 放开权限、CDP、下载或本机执行能力，绕过用户确认与 enterprise policy；
- 在每个调用点重复 `IsEnabled()`，导致一次会话中入口和回调对同一行为作出不同解释。

正确做法是先定义 feature 的生命周期：默认状态、依赖的 build/platform、参数 schema、启用/关闭时用户数据的语义、观测指标、停止开关、何时删除旧路径。高风险 capability 的最终 allow 决策必须仍由权限、policy 和 caller identity 完成；flag 最多决定“这份实现是否被考虑”。

## Variations 与 field trial：实验分组需要可重放证据

`base/metrics/field_trial.*` 和 `components/variations/` 处理 field trial、seed、study filtering、entropy、active trials 及 child-process 同步；`VariationsService` 和 seed processor 表明实验状态不是某个页面 JS 临时决定的。不同客户端可能因版本、平台、locale、渠道、seed/entropy、policy、命令行或 safe seed 状态进入不同组。

```text
client/version/platform/channel/filterable state
  -> seed / study filtering / entropy assignment
     -> field trial group + feature override + parameters
        -> Browser initialization and child-process synchronization
           -> code observes FeatureList / params
```

实验排障的最低证据应包括：二进制版本与 commit、命令行、FeatureList/field trial 状态、参数、Profile/seed 状态、平台/渠道和采样时间。没有这套快照，“我本机开了/关了”无法解释另一位用户或 Renderer child process 的行为。`child_process_field_trial_syncer.*` 也提示一个关键边界：Browser 决定的实验配置需要在适当时机同步给 child process；不要假设只改 Browser 侧条件，Renderer 就天然一致。

## 如何排查“同版本行为不同”

按覆盖范围从最不可变的因素开始收集，而不是先改一个 flag 试试：

1. 固定二进制、commit、GN args、Distribution id/channel、启动参数和平台；确认不是两个不同 artifact。
2. 确认 FeatureList、field trial group 与参数，分别从 Browser 和需要时的 child process 取得证据。
3. 记录目标 Profile/OTR、effective pref 及其来源；检查是否由 managed/recommended policy 覆盖。
4. 检查 capability 本身的权限、content setting、网络/设备与当前 document/frame 生命周期。
5. 用同一组输入在 clean Profile 和受管理 Profile 重放，给出 enable/disable、policy allow/deny、旧/新值迁移的最小测试矩阵。

这样可以得到一条可复现的因果链：哪层输入改变、覆盖了什么、在何时被读取、哪些进程看到了它，以及关闭后如何安全恢复，而不是只记录“某个开关解决了问题”。

## 本文已核验的源码锚点

| 主题 | 源码入口 |
| --- | --- |
| pref 注册、service 与优先级 | `components/prefs/pref_registry.*`、`pref_service.*`、`pref_value_store.*`、`pref_service_factory.*` |
| policy provider/service/handler | `components/policy/core/common/configuration_policy_provider.*`、`policy_service.*`、`policy_map.*`、`schema_registry.*`、`components/policy/core/browser/configuration_policy_handler.*` |
| Feature 基础设施 | `base/feature_list.h`、`base/metrics/field_trial.*`、`components/variations/feature_overrides.*` |
| variation/seed/child 同步 | `components/variations/variations_seed_processor.*`、`service/variations_service.*`、`child_process_field_trial_syncer.*`、`entropy_provider.*` |
| 实验网络与测试 | `components/variations/net/`、`field_trial_config/`、各模块 `*_unittest.cc` |

## 运行时验证路径

- 在目标 Distribution 记录 effective pref 的值与来源、managed/recommended policy、FeatureList、field trial/参数和命令行；分别验证 Browser 与 Renderer 视角。
- 对一个新 feature 覆盖 default、显式 enable/disable、参数、clean/已有 Profile、normal/OTR、policy allow/deny 和 child process restart；确认关闭路径与数据迁移安全。
- 在 macOS/Windows 的受管理与非受管理环境验证 policy 的加载、刷新、UI 表示与实际 enforcement；不要将本机未受管测试外推到企业部署。

## 排障推演：两台同版本机器为何走了不同代码路径

先确认 binary 和渠道真的相同，再采集 effective state：命令行覆盖、FeatureList 与参数、field trial/seed、managed/recommended policy、Profile pref 及其来源、平台 condition、启动后 child process 接收到的配置。仅比较 `Preferences` 文件或 `chrome://flags` 页面，会漏掉 policy、默认注册值和进程启动快照。

任何配置变更还要验证关闭与迁移路径。Feature 关闭后旧数据是否仍被读取，policy 刷新是否立刻撤销能力，OTR 是否继承不该继承的 pref，child process 是否需要重启，远端 seed 不可用时默认行为是否安全，这些比“开关能打开”更接近真实发布风险。

## Pref 的注册、存储与有效值是三件事

Pref 必须先注册类型与默认值，之后才可能由用户设置、managed/recommended policy、extension 或其他 store 提供值。`Get*` 读到的是优先级合并后的有效值，不一定来自用户持久化文件；只查看 Preferences JSON 也无法解释全部来源。

调试一个 Pref 应记录注册位置、scope（local state 还是 Profile）、默认值、当前 effective value、控制来源和 observer。若把 Local State 用成 Profile Pref，会跨用户共享；若在 observer 中回写同一 Pref，还可能产生循环更新或难以解释的启动顺序。

## Policy 是外部管理契约，不是隐藏开关

Policy 需要 schema、平台 provider、解析验证、映射和 UI/诊断呈现。Mandatory 与 recommended policy 的优先级不同，动态刷新能力也因 policy 而异。直接读取某个注册表/配置文件路径，会绕过 provider、验证和跨平台语义。

产品设计应说明未配置、有效配置、无效值、运行时更新和 Profile 切换时的行为。受管理环境中的 deny 还应给出可理解原因，避免用户反复修改 Pref 却始终被 policy 覆盖。

## Feature 与参数共同定义运行分支

Feature enable/disable 只是入口，FeatureParam/field trial parameter 还可能改变阈值、模式和后端。两台机器都显示 Feature enabled，不代表参数相同。Feature 值也可能来自 compile default、command line、field trial/Variations 或产品 override。

读取 Feature 的时机很重要。部分 Feature 在进程启动或 child process command line 构建前确定，运行中修改 Pref 无法改变已经选择的架构；测试若在 FeatureList 初始化后再设置参数，也可能得到虚假覆盖。

## Variations 的目标是受控实验，不是永久配置中心

Field trial 将用户分组，Variations seed/参数驱动实验行为。它适合可回滚实验和分群，不适合承载必须稳定可解释的 Distribution contract。离线、seed 过期、channel 不同或紧急 kill switch 都会改变实际组态。

排障实验问题要记录 study/group、seed/version、参数、channel、country/entropy 等允许记录的上下文，并遵守隐私限制。只问用户是否打开 `chrome://flags`，无法覆盖服务端 experiment 和产品 override。

## 建立统一的配置来源报告

对于关键能力，可以输出受控诊断表：

| 项目 | 记录内容 |
| --- | --- |
| Feature | enabled state、来源、关键 params |
| Policy | effective value、mandatory/recommended、provider/invalid reason |
| Pref | scope、effective value、controlling store，不输出敏感值 |
| Command line | 只列与能力相关的 allowlisted switches |
| Runtime/lock | Extension、Runtime、Profile schema 与 compatibility |

这张表应面向当前问题最小化，不是把所有用户设置上传。它能让“同版本行为不同”从猜测变成可比较输入。

## 一个优先级冲突的完整推演

假设 Distribution 默认启用 AI 侧边栏，企业 Policy 禁用页面内容读取，用户 Pref 仍显示开启，实验参数又选择新版 Runtime。正确结果应是 UI 能解释能力受管理策略限制，Browser capability 拒绝内容读取，Runtime 版本选择不能绕过 deny。

测试需要覆盖未管理、recommended、mandatory、invalid policy，用户改 Pref，实验组变化，Extension/Runtime 旧版本和重启后持久化。若只验证最终布尔值，无法证明控制来源和用户反馈正确。

## 配置读取时机决定它能否动态生效

有些值只在进程启动、Profile 创建、service 构造或 WebContents 初始化时读取一次；有些通过 observer 动态更新；还有些必须传播到 child process 后才生效。UI 允许修改一个值，不等于当前对象立刻采用它。

为每项关键配置写清 read point、cache owner、observer/propagation、是否需要重启和对既有对象的影响。测试至少覆盖启动前设置、运行中更新、新建对象、已有对象和 Browser 重启。这样“设置页显示已开启但功能不变”才能定位到传播链，而不是继续叠加开关。

诊断输出还应区分“值未提供”“值无效后回默认”“值被更高优先级覆盖”。三者最终 effective value 可能相同，却需要不同修复：补配置、修 schema，或调整正确的 controlling source。

配置废弃也要有迁移策略：停止读取旧值、清理持久化状态、兼容旧 Policy/Extension，并确认回退版本不会把新 schema 解释成另一种含义。仅删除 UI 开关会留下隐形行为。

## 工程结论

配置系统的价值是让行为来源可解释、优先级可验证、失败默认值可审计。一个无法回答“谁设置、何时读取、如何覆盖、怎样撤销”的开关，只是在代码路径外增加新的隐式状态。

## 继续阅读

- [15-DevTools Protocol、调试与自动化：一条高权限控制通道如何进入浏览器](/blog/6404e0541fec1096): 相邻章节的前置机制。
- [17-下载、文件访问、PDF 与打印：网页字节如何受控地变成本机对象](/blog/0392dfd397ada650): 相邻章节的后续机制。

## 上游源码入口

文中的相对源码路径可从 [Chromium 官方上游快照](https://chromium.googlesource.com/chromium/src/+/b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b/) 定位。此入口保留原稿的上游阅读坐标，不包含任何产品定制代码，也不替代运行时验收。
