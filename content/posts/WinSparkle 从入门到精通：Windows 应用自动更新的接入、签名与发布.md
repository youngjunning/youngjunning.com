---
id: "9b79049b9b223352"
title: "WinSparkle 从入门到精通：Windows 应用自动更新的接入、签名与发布"
description: "围绕 DLL 初始化、appcast、EdDSA 和安装器信任边界，理解 Windows 应用更新的通用接入与排障。"
date: null
topic: "engineering"
tags: ["版本与更新"]
collection: "docs"
cover: "/media/9b79049b9b223352-91a1c507c17b926b.webp"
---

围绕 DLL 初始化、appcast、EdDSA 和安装器信任边界，理解 Windows 应用更新的通用接入与排障。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

WinSparkle 最吸引我的地方，是把 Windows 应用的版本发现变成一份可托管在 CDN 上的静态 appcast。它适合已有安装器、希望自己掌握发布节奏的桌面应用；但它不会替你构建安装包、保管签名私钥，或证明一台旧 Windows 客户端真的升级成功。本文围绕 DLL 初始化、appcast、签名与安装器信任边界，说明最小接入与常见故障的定位方法。

![WinSparkle 文章封面：签名安装包进入 Windows 桌面应用](/media/9b79049b9b223352-91a1c507c17b926b.webp)

## 先分清四个角色

| 角色 | 负责什么 | 不能替代什么 |
| --- | --- | --- |
| WinSparkle 客户端 | 检查 feed、展示更新、下载、验签和启动安装器 | 应用自己的构建与安装逻辑 |
| appcast | 声明版本、下载 URL、长度、签名、说明和平台 | 制品本身，也不是动态更新服务 |
| 静态托管/CDN | 通过 HTTPS 提供 XML、说明和安装包 | 客户端内置公钥与签名验证 |
| 发行流水线 | 构建、Authenticode 签名、WinSparkle 签名、上传并激活 feed | 真实旧客户端升级验收 |

*（此版本省略该配图。）*

WinSparkle 文档明确说 appcast 是扩展过的 RSS 2.0 文件，无须服务端组件。它也明确要求 feed、release notes 和下载都走 HTTPS：即使安装包有签名，HTTP 仍允许中间人隐藏或歪曲更新。静态发布省掉的是**动态版本决策 API**，不是托管与发布治理。[Getting Started](https://winsparkle.org/guides/getting-started/) · [Publishing Updates](https://winsparkle.org/guides/publishing-updates/)

## 从零接入：DLL、版本和启动时机

原生 C/C++ 应用将 `WinSparkle.dll` 随应用部署，并在构建时引入官方头文件与 import library。应用的 `VERSIONINFO` 至少要有准确的 `ProductName`、`ProductVersion`、`CompanyName`；也可以通过 API 显式设置。当前运行版本与 appcast 的 `sparkle:version` 必须使用同一条**严格递增**的比较序列。不要把 Chromium 内核版本、产品展示版本和安装器内部版本随意互换。[Integrating WinSparkle](https://winsparkle.org/guides/integrating-winsparkle/)

```cpp
#include <winsparkle.h>

// 应用主窗口可见后初始化；URL 与公钥来自当前发行渠道的可信构建配置。
win_sparkle_set_appcast_url("https://updates.example.com/app/windows-x64/appcast.xml");
win_sparkle_set_eddsa_public_key("BASE64_PUBLIC_KEY");
win_sparkle_init();

// “检查更新”菜单可调用 win_sparkle_check_update_with_ui()。
// 应用退出时调用 win_sparkle_cleanup()。
```

## 写一份能被客户端理解的 appcast

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle">
  <channel>
    <title>Example Preview Updates</title>
    <item>
      <title>1.1.1</title>
      <sparkle:version>1.1.1.13</sparkle:version>
      <sparkle:releaseNotesLink>https://updates.example.com/preview/1.1.1/notes.html</sparkle:releaseNotesLink>
      <enclosure
        url="https://updates.example.com/preview/1.1.1/setup.exe"
        length="12345678"
        type="application/octet-stream"
        sparkle:os="windows-x64"
        sparkle:edSignature="BASE64_SIGNATURE" />
    </item>
  </channel>
</rss>
```

示例中的长度和签名只是占位值。发布时必须从**最终签名后的安装包字节**计算真实长度和 EdDSA 签名。`sparkle:os="windows-x64"` 按 WinSparkle DLL 的架构筛选；32 位 DLL 即使跑在 64 位 Windows 上，也不会选中 x64 条目。Windows 最低系统版本可用 `sparkle:minimumSystemVersion`。不要假定 macOS Sparkle 的所有 appcast 字段在 WinSparkle 中都受支持。[Publishing Updates](https://winsparkle.org/guides/publishing-updates/)

## 两条签名链与安装器 UI

WinSparkle 的 EdDSA 私钥为**更新文件字节**签名，客户端内置相应公钥后，下载完成会验签；签名不匹配应拒绝安装。官方的 `winsparkle-tool generate-key --file private.key` 可生成密钥，私钥只能留在受控发布环境。Windows Authenticode 则证明 PE 发布者身份，供 Windows 安装信任链检查。两者解决不同问题，发行流程应同时验证，不把一个成功当作另一个成功。[Getting Started](https://winsparkle.org/guides/getting-started/)

## 常见故障按层定位

| 现象 | 先核对 |
| --- | --- |
| 无更新提示 | 运行版本与 `sparkle:version` 的顺序、appcast URL、渠道、检查频率、用户跳过版本状态 |
| 下载失败 | HTTPS、证书、CDN 对象、重定向、大小、网络代理 |
| 下载后拒绝安装 | EdDSA 公钥、签名对应的最终文件字节、文件被重签/重包、架构 |
| 安装器启动但版本不变 | 安装参数、进程退出/文件占用、UAC、安装目录与 ProductVersion |
| 点击更新后没有重启或仍是旧版本 | `mini_installer.exe` 退出码、磁盘安装版本是否高于运行版本、重启请求与新进程版本 |
| 新装正常但旧客户端不升级 | 旧客户端仍走 Omaha、尚未手动重装、渠道身份或版本比较回退 |

每个故障都要保留客户端日志、feed 快照、制品哈希和 Windows 原生安装结果。macOS 上的源码检查不能代替 Windows 安装和旧客户端升级证据。

## 继续阅读

- [WinSparkle 官方文档](https://winsparkle.org/guides/getting-started/)：接入、appcast、签名和 API 的权威说明。
