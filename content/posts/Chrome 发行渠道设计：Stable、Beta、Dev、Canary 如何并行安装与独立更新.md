---
id: "b8a9ba7b6ddfa801"
title: "Chrome 发行渠道设计：Stable、Beta、Dev、Canary 如何并行安装与独立更新"
description: "区分渠道和应用身份，理解并行安装需要隔离名称、安装位置、更新身份和用户数据，而不只是更换更新 URL。"
date: null
topic: "principles"
tags: ["版本与更新"]
collection: "docs"
cover: "/media/b8a9ba7b6ddfa801-0e1236a1e081514e.webp"
---

区分渠道和应用身份，理解并行安装需要隔离名称、安装位置、更新身份和用户数据，而不只是更换更新 URL。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

Chrome 把 Stable、Beta、Dev、Canary 做成不同下载入口，看起来像是“同一个浏览器提供四种版本”。但从发行工程角度看，它们不是同一个应用临时切换四条更新 URL，而是共享 Chromium 演进主线、拥有不同发布节奏，并在操作系统上以不同 Application Identity 存在的四个应用。

这一区分直接决定两个结果：第一，用户能否在同一台电脑上同时安装和运行多个渠道；第二，一个 Preview 构建会不会覆盖 Stable、争用同一份用户数据，或者被 Updater 当作同一个产品升级和降级。

![Chrome 式多发行渠道封面](/media/b8a9ba7b6ddfa801-0e1236a1e081514e.webp)

## 一句话总结

**Release Channel 决定应用接收哪一条发布轨道，Application Identity 决定操作系统把它视为哪一个应用。** 想实现 Chrome 式并行运行，两者必须同时隔离；只改变 `channel=preview`、更新 URL 或版本号，不会自动得到第二个可独立安装的 App。

## Chrome 所说的“发行渠道”到底是什么

Release Channel 是一条持续演进的软件发布轨道。每条轨道接收不同成熟度和节奏的构建，版本在验证通过后逐级向稳定方向推进。

Google 当前把 Chrome Browser 的渠道定义为 Stable、Extended Stable、Beta、Dev 和 Canary。Stable 面向大多数用户；Extended Stable 降低 feature release 频率；Beta、Dev 和 Canary 依次承担更早期的兼容性验证与实验。Google 的企业文档明确说明，Stable、Beta、Dev、Canary 可以在 Windows 和 macOS 上同时运行，而且它们不共享安装位置和用户 Profile。[Chrome browser release channels](https://support.google.com/chrome/a/answer/9027636?hl=en)、[Test Chrome browser channels](https://support.google.com/chrome/a/answer/9300510?hl=en)

这里有两个容易混淆的动作：

1. **安装另一个渠道应用**：例如保留 Stable，同时安装 Beta。这要求两个应用拥有不同身份和本机状态，目标是并行运行。
2. **切换现有安装的更新渠道**：例如把某台受管设备从 Beta 改回 Stable。它改变同一安装后续接收的版本；如果目标渠道版本更低，默认不会立刻降级，可能要等待目标渠道追上，或显式启用 rollback。这个行为由 Chrome 的 `TargetChannel` 等策略控制。[Manage Chrome updates](https://support.google.com/chrome/a/answer/6350036?hl=en)

Extended Stable 更接近第二种能力：它是 Stable 产品族的一种较慢更新节奏。Google 的并行安装说明列出 Stable、Beta、Dev、Canary，并没有把 Extended Stable 描述成第五个独立安装应用。因此，在架构设计里不应看到五个渠道名，就机械地创建五套 App Identity。

## Channel、Application、Build Type 和 Update Ring 不是一回事

工程讨论里最常见的问题，不是缺少术语，而是把几个相邻概念当成同一个配置项。

| 概念 | 回答的问题 | 典型值 | 是否决定同机并存 |
| --- | --- | --- | --- |
| Release Channel | 这个应用持续接收哪条发布轨道 | Stable、Beta、Dev、Canary、Preview | 间接决定 |
| Application Identity | 操作系统和 Updater 认为“它是谁” | Bundle ID、App ID、GUID、产品名 | **直接决定** |
| Build Type | 这次构建采用什么编译与调试属性 | Debug、Release、Official | 不决定 |
| Update Ring | 同一渠道内谁先收到同一个版本 | internal、5%、25%、100% | 通常不决定 |
| Environment | 更新控制面和数据面部署在哪里 | pre、prod | 不应直接等价于渠道 |

`Release` build 不等于 Stable，`Debug` build 也不等于 Canary。一个 Official build 可以发布到 Preview；同一个 Stable release 也可以通过 Update Ring 分批推给不同设备。环境只表达服务部署边界，渠道表达客户端长期跟随的发布轨道。

这个模型的最小不变量是：**如果两个渠道需要同时存在于一台设备，它们必须先成为两个应用，再各自绑定渠道。**

*（此版本省略该配图。）*

## 为什么只改更新 URL 不够

假设 Stable 和 Preview 使用同一个应用名、Bundle ID、Windows Browser App ID 与用户数据目录，仅在启动参数或 updater tag 中写入不同 channel，至少会出现四类冲突。

### 安装冲突

安装器和操作系统会把两个制品识别成同一产品。后安装的 Preview 可能覆盖 Stable，卸载其中一个也可能破坏另一个。桌面快捷方式、默认浏览器注册和协议关联无法稳定区分目标。

### 更新冲突

Updater 以 App ID 等持久身份维护版本、策略和任务。两个渠道共用注册身份时，同一台设备上不是存在“两套独立更新”，而是两个发布者争夺同一个产品状态。高版本 Preview 还可能使 Stable 切换表现为降级，触发等待或 rollback 语义。

### 运行时冲突

Browser 单实例锁、mutex、进程发现与 IPC 通常基于产品身份派生。即使两份二进制位于不同目录，共用 identity 仍可能导致第二个应用把启动请求交给第一个进程。

### 用户数据冲突

不同 Chromium 版本交替读写同一个 User Data Directory，会把测试环境和日常工作数据耦合在一起。新版本写入的 Profile schema 也未必能被旧版本安全读取。Chrome 官方并行安装方案明确隔离用户 Profile，原因就在这里。

因此，更新 URL 只是隔离矩阵中的一格。它解决“去哪里检查”，不能解决“系统认为你是谁”“安装到哪里”“读取哪份数据”和“由哪个 Updater registration 管理”。

## 一套可并行安装的渠道需要隔离哪些身份

不同操作系统的字段不同，但责任边界一致。

| 维度 | macOS | Windows | 不隔离的直接后果 |
| --- | --- | --- | --- |
| 用户可见身份 | App display name、icon | Product name、icon、shortcut | 用户无法区分，快捷方式互相覆盖 |
| OS 应用身份 | Bundle ID | installer/product GUID、App registration | 安装、卸载或系统注册冲突 |
| 更新身份 | Sparkle feed 所属 App identity | Chromium Updater App ID、相关 GUID | 两条渠道争用更新状态 |
| 进程协调 | bundle/product 派生的进程状态 | mutex、COM CLSID/IID、service/task identity | 单实例、IPC 或 updater 进程串线 |
| 安装路径 | 独立 `.app` | 独立 application directory | 文件覆盖或卸载误伤 |
| 用户数据 | 独立 User Data Directory | 独立 User Data Directory | Profile 污染、schema 回退风险 |
| 更新轨道 | 独立 appcast/channel | endpoint、`ap`、descriptor pointer | 接收错误版本 |
| 更新信任 | Sparkle public key | CUP public key、CRX3 public-key hash | 无法证明响应或 payload 属于本渠道 |

签名主体不一定要按渠道拆分。Stable 与 Preview 可以继续使用同一家公司的 Developer ID 或 Authenticode 证书，因为它们表达“谁发布了这个二进制”；CUP、CRX3、Sparkle feed key 等更新信任则可以按渠道隔离，因为它们约束“哪条更新链有权推进这个应用”。不要因为字段都叫 key，就把代码签名和更新协议签名合并成一套概念。

## 一次 Chrome 式更新是怎样找到正确渠道的

以 Windows 为例，可以把链路压缩成四步：

1. 安装器把渠道专属 Browser App ID、Updater App ID、版本和 channel tag 写入本机注册状态。
2. Chromium Updater 按这个 Application Identity 发起 update check，而不是扫描机器上所有相似 EXE 后猜测渠道。
3. 更新服务校验应用身份和渠道，为它选择对应的 release descriptor。
4. 客户端下载、验证并安装该渠道的制品，只推进这一套应用状态。

## 发布和验收不能只看构建成功

多渠道设计真正完成，要分别验证源码、制品、服务端和旧客户端。下面这些状态不能合并成一句“已经发布”：

| 门禁 | 要证明什么 |
| --- | --- |
| Profile validated | Preview identity 字段完整，并且没有与 Stable 重复 |
| Stage generated | 当前 target/channel 解析出的品牌、endpoint 和 trust root 正确 |
| Native built | Stable 与 Preview 生成不同应用名和原生身份 |
| Signed / packaged | 每条渠道的最终安装包和更新 payload 完整、可验签 |
| Uploaded | versioned artifact 与 descriptor 已进入 CDN 并完成 readback |
| Side-by-side installed | 两个应用能同时安装、启动和卸载，互不破坏 |
| Live updated | 一台旧 Preview 客户端通过真实 Omaha/CUP/CRX3 链路升级成功 |

最终验收至少要覆盖：两个应用同时出现在系统中；分别打开各自的 About 页面；进程、安装目录和 User Data Directory 不相同；Preview 更新不会改变 Stable 版本；卸载 Preview 后 Stable 仍能启动和更新。

## 我的判断

Chrome 的渠道体系最值得复用的，不是 Stable、Beta、Dev、Canary 这四个名字，而是它背后的产品边界：**共享代码演进，隔离应用身份；共享发行基础设施，隔离更新状态；用 channel 表达成熟度，用 ring 表达放量。**

## 相关资料

1. [Chrome browser release channels](https://support.google.com/chrome/a/answer/9027636?hl=en)
2. [Test Chrome browser channels](https://support.google.com/chrome/a/answer/9300510?hl=en)
3. [Manage Chrome updates on Windows](https://support.google.com/chrome/a/answer/6350036?hl=en)
