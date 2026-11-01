---
id: "828e123d51b5a02d"
title: "Sparkle 从入门到精通：macOS 应用自动更新的接入、发布与排障"
description: "从 appcast、EdDSA 与 macOS 签名两条信任链，到最终制品发布和旧客户端验证，建立 macOS 更新的通用流程。"
date: null
topic: "engineering"
tags: ["版本与更新"]
collection: "docs"
cover: "/media/828e123d51b5a02d-152f4df4f0d97eca.webp"
---

从 appcast、EdDSA 与 macOS 签名两条信任链，到最终制品发布和旧客户端验证，建立 macOS 更新的通用流程。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

Sparkle 最容易制造的一种错觉，是“应用里出现了检查更新按钮，就算接入完成”。真正可交付的自动更新远不止一个 UI：旧客户端要发现正确版本，下载最终制品，验证更新签名，启动 updater，通过 macOS 的代码签名与 Gatekeeper 检查，替换旧 App，重启后还要保持用户数据和应用身份不变。

![Sparkle macOS 自动更新教程封面：受保护的应用更新包沿可信通道送达桌面客户端](/media/828e123d51b5a02d-152f4df4f0d97eca.webp)

![Sparkle 自动更新由 macOS 平台信任链与 Sparkle EdDSA 更新信任链共同保护，最终需要在真实旧客户端上汇合验证](/media/828e123d51b5a02d-b291b8f647d7f549.webp)

## 一句话理解 Sparkle

Sparkle 是一个运行在 macOS App 内的开源软件更新框架。它读取一份叫 appcast 的 RSS/XML feed，判断是否有更高版本，下载更新制品，验证更新来源，然后协调 helper 完成替换与重启。

可以把最小更新链理解成：

```text
旧 App
  → 请求 appcast
  → 比较 CFBundleVersion
  → 下载 DMG / ZIP / TAR / AAR / PKG
  → 验证 Sparkle EdDSA signature
  → 解包并验证 macOS code signature
  → 启动 updater/helper
  → 替换 App
  → relaunch 新 App
```

Sparkle 负责客户端更新机制，但不替团队完成下面这些事情：

| Sparkle 能做 | 仍由应用团队负责 |
| --- | --- |
| 检查 feed、比较版本、下载和安装 | 构建可发布 App 与最终 archive |
| 验证 EdDSA 更新签名 | Developer ID 签名、notarization、staple |
| 展示更新 UI、release notes | 托管 artifact、appcast 与渠道控制 |
| 支持 channels、phased rollout、delta | 灰度策略、监控、回滚和旧客户端验收 |

因此，“Sparkle 接入完成”和“某个版本已经安全送达用户”是两种不同结论。

## 第一部分：先跑通一个最小更新

### 1. 准备两个真实版本

不要只准备一个 App，然后临时修改 feed 自测。最小闭环至少需要：

| 角色 | 展示版本 | 内部版本 | 用途 |
| --- | --- | --- | --- |
| 旧客户端 | `1.0.0` | `100` | 安装到 `/Applications`，主动检查更新 |
| 新制品 | `1.0.1` | `101` | 被 appcast 发布，供旧客户端下载 |

`CFBundleShortVersionString` 是给人看的版本，例如 `1.0.1`；`CFBundleVersion` 是机器比较使用的内部版本，例如 `101`。Sparkle 默认以递增且格式正确的 `CFBundleVersion` 判断新旧，appcast 中对应 `sparkle:version`。不要用 Git SHA、日期描述或不可稳定排序的字符串充当内部版本。

### 2. 把 Sparkle 加入 App

对 Xcode 项目，最直接的方式是 Swift Package Manager：

1. 在 Xcode 中选择 `File → Add Packages…`。
2. 输入 `https://github.com/sparkle-project/Sparkle`。
3. 选择经过评估的 Sparkle 2 精确版本或受控版本范围。
4. 确认 `Sparkle.framework` 被嵌入 App，并在发布构建中正确签名。

如果使用 Carthage 或预编译 framework，要额外确认 `Embed & Sign`、Runpath Search Paths、framework symlink 和可执行权限没有在复制或归档时丢失。非 Xcode 构建系统还要检查 `otool -L` 与 `otool -l`，保证运行时只依赖 App bundle 内或系统提供的路径。具体接入差异见 [Sparkle Basic Setup](https://sparkle-project.org/documentation/) 和 [Programmatic Setup](https://sparkle-project.org/documentation/programmatic-setup/)。

对于标准 AppKit 应用，可以让 `SPUStandardUpdaterController` 管理默认 UI 与主 App 更新：

```swift
import Cocoa
import Sparkle

final class AppDelegate: NSObject, NSApplicationDelegate {
    private let updaterController = SPUStandardUpdaterController(
        startingUpdater: true,
        updaterDelegate: nil,
        userDriverDelegate: nil
    )

    @IBAction func checkForUpdates(_ sender: Any?) {
        updaterController.checkForUpdates(sender)
    }
}
```

把菜单中的“检查更新…”连接到这个 action。SwiftUI、Catalyst、Qt 或自定义 UI 可以直接使用 `SPUUpdater`，但不要一上来重写整套 updater UI；先用标准控制器跑通完整链路，再决定哪些交互确实需要定制。

### 3. 生成 EdDSA 密钥

在 Sparkle distribution 根目录运行：

```bash
./bin/generate_keys
```

该工具默认把 private key 保存到当前 Mac 的 login Keychain，并输出 public key。private key 用来签发布制品，不能打进 App，也不应放在下载服务器或 Git 仓库；public key 则要随旧客户端一起发布。

把 public key 写进 App 的 `Info.plist`：

```xml
<key>SUPublicEDKey</key>
<string>YOUR_BASE64_PUBLIC_KEY</string>
```

这一步决定了“旧客户端信任谁发布的后续更新”。密钥轮换不是普通配置修改：如果旧客户端不认识新 key，就无法验证只用新 key 签出的制品。Sparkle 对 Developer ID App 提供了受约束的轮换路径，但证书与 EdDSA key 不能在同一次普通更新中随意同时替换。密钥生成、导入导出和轮换约束以 [Sparkle 安全文档](https://sparkle-project.org/documentation/) 为准。

### 4. 配置 appcast 地址

给静态、稳定的 feed URL，优先写 `Info.plist`：

```xml
<key>SUFeedURL</key>
<string>https://updates.example.com/stable/appcast.xml</string>
```

如果不同用户需要不同 feed，使用 `SPUUpdaterDelegate` 的 `feedURLStringForUpdater:`；不要继续依赖已弃用的 `setFeedURL:`，它存在竞态和 UserDefaults 永久残留问题。beta/nightly 场景应优先评估 Sparkle channels，而不是为每个渠道复制一套不可追踪的运行时 URL 修改逻辑。

### 5. 构建并冻结最终制品

先完成发布 App 的 Developer ID 签名、notarization 和必要的 staple，再生成最终 DMG、ZIP 或其他 Sparkle 支持的 archive。归档过程必须保留 symlink、资源 fork、权限和 nested code signature。

ZIP 可以使用官方文档给出的 `ditto` 方式：

```bash
ditto -c -k --sequesterRsrc --keepParent MyApp.app MyApp-1.0.1.zip
```

如果公司签名服务会接收 unsigned DMG，再返回 signed/notarized/stapled DMG，那么返回后的文件才是 Sparkle 要签的 final artifact。任何重新封装、staple 或字节级修改都会改变 length、SHA-256 和 EdDSA signature。

### 6. 生成 appcast

把新旧版本 archive 放进一个专用 updates 目录，然后运行：

```bash
./bin/generate_appcast /path/to/updates/
```

`generate_appcast` 会读取 archive、生成 EdDSA signature 和 appcast，并在满足条件时生成 delta。它是官方推荐方式，优先级高于手工拼 XML。需要单独检查某个制品时，可以运行：

```bash
./bin/sign_update /path/to/MyApp-1.0.1.dmg
```

输出会包含可以放进 enclosure 的 `sparkle:edSignature` 与 `length`。一个最小 appcast item 的核心关系是：

```xml
<item>
  <title>Version 1.0.1</title>
  <sparkle:version>101</sparkle:version>
  <sparkle:shortVersionString>1.0.1</sparkle:shortVersionString>
  <pubDate>Tue, 01 Sep 2026 08:00:00 +0000</pubDate>
  <enclosure
    url="https://updates.example.com/artifacts/MyApp-1.0.1.dmg"
    sparkle:edSignature="GENERATED_SIGNATURE"
    length="GENERATED_BYTE_LENGTH"
    type="application/octet-stream" />
</item>
```

手工示例用于理解字段，不建议复制它代替 `generate_appcast`。完整字段、minimum system version、critical update 与 release notes 规则见 [Publishing an update](https://sparkle-project.org/documentation/publishing/)。

### 7. 先上传制品，最后激活 feed

正确顺序是：

```text
final artifact
  → 生成 signature / length / SHA-256
  → 上传 versioned artifact
  → 从公开 URL 完整回读并校验
  → 上传 release notes / delta
  → 最后更新 appcast
  → 从公开 URL 回读 appcast
```

appcast 是发布开关。若先更新 feed，客户端可能立刻看到一个尚未上传、未完成 CDN 刷新或字节不一致的制品。artifact URL 应版本化且尽量 immutable；不要在相同 URL 上静默覆盖不同字节。

### 8. 用旧客户端完成验收

把 `1.0.0 (100)` 安装到 `/Applications`，而不是直接运行 Xcode build 目录中的 App。然后验证：

1. “检查更新…”能发现 `1.0.1 (101)`。
2. 版本说明、下载大小和目标版本正确。
3. 下载完成后 EdDSA 验签成功。
4. updater/helper 能启动，没有 Gatekeeper 或 XPC timeout。
5. App 被替换并重新启动。
6. 新进程回读到 `1.0.1 (101)`。
7. preferences、Keychain、登录态、默认打开方式和业务数据保持正常。

到这里，才算最小更新闭环跑通。

## 第二部分：看懂 Sparkle 的运行结构

### App、framework、helper 与 appcast 各负责什么

| 组件 | 主要职责 | 常见失败 |
| --- | --- | --- |
| 主 App | 启动 updater、提供配置和用户入口 | updater 没启动、配置未进入最终 bundle |
| `Sparkle.framework` | 检查、选择、下载、验签与流程协调 | 版本兼容、API 或 framework 签名问题 |
| Downloader/Installer XPC Service | sandbox 场景下执行受限的下载或安装工作 | entitlement、service 嵌入、签名和通信失败 |
| Updater/Autoupdate helper | 在合适时机替换旧 App 并 relaunch | Gatekeeper、权限、只读卷、App Translocation |
| appcast | 描述有哪些更新、给谁、从哪里下载 | 缓存、版本排序、URL、signature、length 错误 |
| update artifact | 承载真正的新 App | nested code、notarization、归档完整性错误 |

如果 App 开启 sandbox，不能照搬非 sandbox 接入。Downloader XPC Service、Installer XPC Service、Mach service 名称和 entitlements 都有额外要求，应按 [Sparkle Sandboxing Guide](https://sparkle-project.org/documentation/sandboxing/) 配置并使用生产签名构建验收。

### 自动检查不是“每次启动强制请求”

Sparkle 默认管理自己的检查周期，官方文档给出的默认调度是每 24 小时一次。不要在任意生命周期里反复调用 `checkForUpdatesInBackground`，这会干扰 scheduler。用户主动点击时调用 `checkForUpdates`；用户修改渠道或 feed 后，使用 `resetUpdateCycleAfterShortDelay` 或 `resetUpdateCycle` 让 updater 重新计算周期。

“关于”页主动检查与后台更新必须共享状态：`canCheckForUpdates == NO` 表示暂时不能启动第二次检查，不能据此显示“已是最新版本”。此时应重放正在检查、下载或解包的状态；已准备好安装时保留重新启动入口。后台下载需要接收 delegate 的下载、解包和退出安装准备回调，不能只依赖 user driver。`dismissUpdateInstallation` 只关闭 Sparkle 的界面，不应抹掉已准备好的安装、右上角提醒或最近一次检查错误。

## 第三部分：两条信任链为什么缺一不可

### macOS 平台信任链

这条链保护 App 及其 nested code 的平台身份：

```text
Developer ID signing
  → Hardened Runtime / entitlements
  → notarization
  → staple（按制品形态）
  → Gatekeeper assessment
```

常用检查包括：

```bash
codesign --verify --deep --strict --verbose=4 /Applications/MyApp.app
spctl --assess --type execute --verbose=4 /Applications/MyApp.app
xcrun stapler validate /path/to/MyApp.dmg
```

`codesign --deep` 适合作为诊断检查，但不能代替团队对主 App、framework、XPC service、helper、entitlements 和 Team ID 的逐层审计。

### Sparkle 更新信任链

这条链保护 appcast 指向的更新 artifact：

```text
private EdDSA key
  → sign final archive bytes
  → appcast enclosure signature + length
  → old App 内的 SUPublicEDKey 验证
```

它回答的是“下载到的字节是否由持有 private key 的发布方签出”，不是“macOS 是否允许其中的代码运行”。

| 现象 | EdDSA | macOS code signature / Gatekeeper | 结果 |
| --- | --- | --- | --- |
| 更新签名错误 | 失败 | 未进入或无意义 | Sparkle 拒绝制品 |
| 更新签名正确，App 未正确签名 | 通过 | 失败 | 下载成功但安装/运行失败 |
| App 签名正确，appcast 被篡改 | 失败或 URL/元数据风险 | 可能通过 | Sparkle 应阻断更新 |
| 两条链都通过 | 通过 | 通过 | 仍需验证替换、重启和业务状态 |

Sparkle 2.9 还支持 signed feed。启用 `SURequireSignedFeed` 可以保护 feed 与 release notes 元数据，但同时要求更严格的密钥管理与重签流程；修改已经签名的 appcast 或 release notes 后必须重新生成签名。它是 artifact signature 之外的增强，不是替代。

## 第四部分：版本、渠道、灰度与回滚

### 版本比较的工程约束

一条更新记录至少要区分：

| 字段 | 用途 | 建议 |
| --- | --- | --- |
| `CFBundleShortVersionString` | 用户看到的版本 | 使用稳定的产品 SemVer |
| `CFBundleVersion` | 客户端内部比较 | 单调递增、机器可排序 |
| `sparkle:shortVersionString` | appcast 展示版本 | 与新 App 保持一致 |
| `sparkle:version` | appcast 内部版本 | 与新 App 的 `CFBundleVersion` 一致 |

App 显示版本相同但 build 不同是允许的，但 appcast 与最终 App 必须一一对应。若同一内部版本先后指向不同字节，一部分客户端和 CDN 可能继续使用旧缓存，排障会失去确定性。

### Channels 解决“谁能看到”

Sparkle 2 的 channels 适合 stable/beta 这类阶段性分支。客户端通过 `allowedChannelsForUpdater:` 声明额外允许的 channel；default channel 始终存在，channel 也不适合承载永不汇回主线的平行产品。

如果旧客户端使用的 Sparkle 版本不理解 channels，不能仅修改 appcast 就假设它们会正确选择。新特性是否可用，取决于“发起检查的旧客户端里嵌的 Sparkle”，而不是新制品里将要携带的 Sparkle。

### Phased rollout 解决“什么时候看到”

`sparkle:phasedRolloutInterval` 可以把自动更新分成 7 个组逐步放量。例如间隔为 86400 秒时，大致每天增加一组，七天完成。需要注意两个例外：

1. 用户主动检查更新不受 phased rollout 阻挡。
2. critical update 不受 phased rollout 阻挡。

所以 phased rollout 是降低自动推送爆炸半径的机制，不是严格流量开关。需要精确人群、组织、地域或设备策略时，应在 feed 服务和业务发布控制面实现，并保持客户端选择逻辑可审计。

### 回滚通常不是“把版本号改回去”

Sparkle 默认安装更高内部版本。已经升级到 `101` 的客户端不会因为 appcast 重新指向 `100` 就自动降级。线上故障时通常有三种动作：

| 动作 | 能解决什么 | 不能解决什么 |
| --- | --- | --- |
| 从 appcast 移除问题版本 | 阻止尚未发现的客户端继续获得它 | 撤回已经安装的版本 |
| 暂停/替换 feed 响应 | 控制后续发现 | 修复已下载或已安装状态 |
| 发布更高 build 的修复版 | 让所有受影响版本回到已知好代码 | 恢复不可逆的数据迁移 |

因此，数据库、UserDefaults、Keychain 或本地文件格式迁移必须具备向前修复能力。不要把二进制更新回滚当作数据回滚。

### Delta 是优化，不是发布前提

`generate_appcast` 可以为已有版本生成并签名 delta。客户端找不到匹配 delta，或 patch 无法干净应用时，会回退到 full update。delta 必须由真实旧、新 App 生成与验证；临时修改版本号的同一份 App 不能证明 delta 可用。格式兼容规则见 [Delta Updates](https://sparkle-project.org/documentation/delta-updates/)。

## 第五部分：一条可复用的生产发布 SOP

### 先把三种制品状态分开

Sparkle 发布最容易混淆的不是命令，而是“当前手里的文件到底处于什么状态”。送签前的 unsigned DMG 与公司签名服务回传的 signed、notarized、stapled DMG 是两份不同的字节制品，必须分别记录：

| 状态 | 制品 | 能证明什么 | 不能证明什么 |
| --- | --- | --- | --- |
| `unsigned` | Release App 打包出的 unsigned DMG 与 signing handoff | Bundle、依赖闭包和送签输入通过构建门禁 | 平台签名、公证、Sparkle 签名与下载渠道完成 |
| `final signed` | 公司签名回传的 signed/notarized/stapled DMG | 可进入最终验收和 Sparkle 签名 | 已上传、feed 已激活、旧客户端已升级 |
| `published update` | appcast 精确引用且已从公开地址回读的 final DMG | URL、length、EdDSA signature 与下载字节一致 | 所有旧客户端均已完成安装与重启 |

公司签名、notarization、staple、重新封装或任何字节变化，都会让旧 SHA-256、length 和 Sparkle signature 失效。`sign_update final.dmg` 签的是 final DMG 的完整字节，不是版本号、逻辑上的 App 或文件名：

```text
同一条 appcast enclosure
  = 固定 URL + 固定 final DMG 字节 + 固定 length + 固定 EdDSA signature
```

![Sparkle 生产发布的四个独立交付状态：冻结最终制品、生成更新签名并上传、最后激活 appcast、用真实旧客户端完成升级验收](/media/828e123d51b5a02d-0633a99dd4de2f05.webp)

### 发布前冻结

1. 固定 source commit、依赖 lock、Sparkle version、target architecture 和 App version/build。
2. 确认旧版本到新版本的兼容矩阵，包括最低 macOS、Intel/Apple silicon 与 sandbox 模式。
3. 冻结 `SUPublicEDKey`、Bundle ID、Team ID 和 feed/channel 选择规则。

### 构建与平台签名

1. 构建 Release App，核对 framework、XPC、helper 与资源完整性。
2. 完成 Developer ID signing、notarization 和 staple。
3. 对最终 App/DMG 做 `codesign`、`spctl`、stapler、Team ID 与 entitlement 检查。
4. 冻结 final artifact；后续不再重新封装或修改字节。

### 更新签名与上传

1. 只对 final artifact 生成 EdDSA signature、length 和 SHA-256。
2. 上传到 versioned immutable URL。
3. 从最终公开 URL 完整下载，复算 length 与 SHA-256。
4. 生成或重生成 appcast；signed feed 场景同时重签 release notes。
5. 最后激活 appcast，并回读 XML 检查实际生效内容。

### 客户端验收

1. 用每个受支持起始版本检查更新。
2. 覆盖用户主动检查、后台检查、下载完成后的右上角提示、点击安装、完整退出再打开及升级版本提示；旧客户端的历史行为单独验证。
3. 覆盖 arm64/x86_64、最低/当前 macOS、全新安装/长期使用 Profile。
4. 验证下载、验签、helper 启动、替换、relaunch 和版本回读。
5. 验证登录态、Keychain、preferences、默认打开方式和核心业务。

下面这些状态必须分别记录，不能用一个“已发布”概括。源码修复、npm package 发布、Distribution 采用、final DMG 签名、feed 激活和旧客户端升级是独立状态；前一步完成，不自动证明后一步完成：

```text
Source Ready
→ Framework/Package Ready
→ Distribution Adopted
→ Signed Artifact Ready
→ Artifact Uploaded
→ Appcast Activated
→ Old-client Accepted
```

## 第六部分：从日志定位故障层

### 先按阶段提问

| 症状 | 首先确认 | 常见根因 |
| --- | --- | --- |
| 点击后没有任何反应 | updater 是否启动、`canCheckForUpdates` | controller 生命周期、菜单连接、framework load |
| 提示没有更新 | feed 内容与版本比较 | `CFBundleVersion` 未递增、channel/OS 不匹配、缓存 |
| 无法获取更新信息 | `SUFeedURL` 与 HTTP/TLS | 404、ATS、XML、代理、证书 |
| 下载后签名错误 | 公开 URL 的实际字节 | 签了 unsigned/旧 DMG、CDN 覆盖、length 不一致 |
| 下载成功但安装失败 | helper、codesign、Gatekeeper | nested code、notarization、权限、只读卷 |
| 一直等待 updater | XPC/launchd/进程终止原因 | helper 没启动、Gatekeeper kill、service 配置 |
| 安装后没升级 | 目标路径与 relaunch 结果 | App Translocation、多份 App、替换权限 |

### 常用本机证据

先确认实际运行的 App 路径和版本：

```bash
mdls -name kMDItemVersion /Applications/MyApp.app
defaults read /Applications/MyApp.app/Contents/Info CFBundleVersion
```

再检查系统统一日志。不同 Sparkle/macOS 版本的 subsystem 和文案可能变化，因此先用进程名、Bundle ID、Sparkle、Updater、Autoupdate 和 launchd 组合过滤，而不是只依赖一条固定字符串：

```bash
log show --last 30m --style compact \
  --predicate 'eventMessage CONTAINS[c] "Sparkle" OR eventMessage CONTAINS[c] "Updater" OR eventMessage CONTAINS[c] "Autoupdate"'
```

发生“已损坏”“无法打开”或 helper 无响应时，再关联 crash/termination、`spctl`、codesign 与 cache 路径。应用层 timeout 往往只是最后一层表现，真正的拒绝可能早已出现在 Gatekeeper 或 launchd 日志里。

## 第八部分：从“能用”进阶到“可靠”

### 安全基线

1. artifact 和 appcast 全部使用 HTTPS，并满足 ATS。
2. EdDSA private key 与下载/CDN 服务隔离，CI 只通过受控 secret 注入。
3. 发布前验证 final bytes，禁止对 unsigned 或待 staple 制品生成最终 signature。
4. 保留每个版本的 appcast、artifact SHA-256、signature、length、codesign 和 notarization evidence。
5. 持续跟踪 Sparkle 的 security/reliability release notes；框架升级按供应链变更重新验收，而不是只改版本号。

Sparkle 官方的 [Security and Reliability Changes](https://sparkle-project.org/documentation/security-and-reliability/) 会列出需要关注的修复。例如后续版本可能包含安装 timeout、delta symlink 或 appcast 信息一致性修复；是否升级要结合旧客户端兼容、sandbox 模式、本地 patch 和真实回归决定。

### 可观测性

发布系统至少应能回答：

| 问题 | 最低证据 |
| --- | --- |
| 客户端看到哪个 feed | 最终 URL、响应状态、ETag/Last-Modified、内容摘要 |
| 选择了哪个 item | 当前/目标内部版本、channel、OS/architecture 约束 |
| 下载了什么 | 最终 URL、byte length、SHA-256、是否 delta |
| 为什么拒绝 | Sparkle error domain/code、底层 cause、系统日志关联 |
| helper 是否启动 | process/launchd/XPC 证据与 termination reason |
| 是否真正完成 | 新进程版本、安装路径、核心业务 smoke result |

日志不能包含 private key、完整用户标识、敏感 feed token 或未脱敏系统信息。UI 只展示用户可行动的错误与恢复动作，完整技术详情进入受控日志。

### 测试矩阵

不要只测试“上一版 stable → 当前版 stable”。长期运行的更新系统至少覆盖：

| 维度 | 示例 |
| --- | --- |
| 起始版本 | 最近一版、长期未更新版、带旧 Sparkle 的 bootstrap 版 |
| CPU | arm64、x86_64 |
| macOS | 最低支持版、当前主流版、最新受支持版 |
| App 状态 | `/Applications`、只读卷、非标准目录、存在多份 App |
| 检查方式 | 用户主动、后台、自动下载、点击安装、完整退出安装与升级版本提示 |
| 网络 | 正常、超时、断点、代理、CDN 未刷新 |
| 制品 | full、delta、签名错误、length 错误、nested code 错误 |
| 用户数据 | 全新 Profile、长期 Profile、Keychain 与权限已有状态 |

## 常见反模式

| 反模式 | 为什么危险 |
| --- | --- |
| 看到更新弹窗就宣布完成 | 还没验证下载、helper、替换、重启与业务状态 |
| 对 unsigned DMG 生成 signature | 公司签名、公证或重封装后字节必然变化 |
| 先发布 appcast，再上传制品 | 客户端会看到尚不可用或未刷新完成的 URL |
| 在同一 URL 覆盖新字节 | CDN、客户端缓存和审计记录失去确定性 |
| 只测试新 App 的 updater | 无法证明旧客户端能 bootstrap 到新 framework |
| 把 codesign 通过当作 EdDSA 通过 | 两条信任链保护的对象不同 |
| 为 cache 问题直接改 Bundle ID | 把局部故障扩大成应用身份与数据迁移 |
| 手工强制每次启动检查 | 干扰 Sparkle scheduler 和用户偏好 |
| 把 phased rollout 当严格灰度 | 手动检查和 critical update 会绕过分组节奏 |
| 发布降版本 appcast 当回滚 | 已升级客户端默认不会自动降级 |

## 最终检查清单

### 接入完成

1. 最终 App 内存在并能加载正确签名的 `Sparkle.framework`。
2. `SPUStandardUpdaterController` 或 `SPUUpdater` 生命周期正确。
3. `SUPublicEDKey` 与 feed 配置进入最终 bundle。
4. `CFBundleVersion` 单调递增，展示版本和内部版本分工明确。
5. sandbox 应用已完成 XPC service 与 entitlement 配置。

### 发布完成

1. final App/DMG 已完成 Developer ID signing、notarization 与必要的 staple。
2. EdDSA signature 和 length 来自 final artifact，不是中间制品。
3. versioned artifact 已上传并从公开 URL 完整回读校验。
4. appcast 最后激活，并已回读核对版本、URL、signature 与 length。
5. release notes、channel、OS/CPU 和最低版本约束符合本次策略。

### 交付完成

1. 真实旧客户端完成发现、下载、验签、helper 启动、安装和 relaunch。
2. 新进程回读到预期版本与 build。
3. arm64/x86_64 和受支持 macOS 矩阵已覆盖。
4. 用户数据、Keychain、preferences、默认打开方式和核心业务正常。
5. 灰度监控、暂停 feed、发布更高 build 修复版和手动覆盖安装入口可执行。

## 参考资料

1. [Sparkle Basic Setup](https://sparkle-project.org/documentation/)：framework 接入、EdDSA key、appcast 生成与基础测试。
2. [Setting up Sparkle programmatically](https://sparkle-project.org/documentation/programmatic-setup/)：SwiftUI、Catalyst、Qt 与底层 API 接入。
3. [Publishing an update](https://sparkle-project.org/documentation/publishing/)：appcast、版本、critical、phased rollout、channels 与 release notes。
4. [Delta Updates](https://sparkle-project.org/documentation/delta-updates/)：delta 生成、签名、fallback 与格式兼容。
5. [Security and Reliability Changes](https://sparkle-project.org/documentation/security-and-reliability/)：升级 Sparkle 时需要重新审计的安全与可靠性修复。
6. [Sparkle discussion #2881](https://github.com/sparkle-project/Sparkle/discussions/2881)：cache 目录与 app-bound provenance 问题背景。
