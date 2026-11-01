---
id: "7e16bb8b65e56b22"
title: "20-网络传输、安全连接与代理：一次 URL 请求如何真正到达对端"
description: "从源码阅读入口、进程边界与验证条件理解网络传输、安全连接与代理：一次 URL 请求如何真正到达对端。"
date: null
topic: "principles"
tags: []
collection: "docs"
cover: "/media/7e16bb8b65e56b22-f88432f7a785128b.webp"
---

从源码阅读入口、进程边界与验证条件理解网络传输、安全连接与代理：一次 URL 请求如何真正到达对端。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

![Chromium 网络传输、安全连接与代理封面](/media/7e16bb8b65e56b22-f88432f7a785128b.webp)

> 阅读坐标沿用原稿：Chromium `153.0.8010.37`，上游 commit `b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b`。本次同步未重新进行源码与目标平台运行时验收。

![一次 URL 请求从代理和 DNS 到 TLS 与 HTTP 会话](/media/7e16bb8b65e56b22-c51b2168aeb4acd7.webp)

## 一句话结论

Network Service 接受 URL 请求后，仍要依次完成代理选择、名称解析、传输连接、安全握手、协议协商和会话复用；每一层都有独立缓存、身份与失败语义，DevTools 中的一条红线不能替代 transport 证据。

导航进入 Network Service 后，仍要继续下钻到“网络真的如何建立”。浏览器请求失败时，“URLLoader 报错”只是表面：失败可能发生在 proxy 配置、DNS、TCP、TLS、证书校验、HTTP/2 session、QUIC 握手、连接池、服务端响应或企业中间人之间。要排障，必须将 URL 与 transport chain 分开。

## 先画出连接决策图

```text
URL / NetworkIsolationKey / request policy
  -> proxy resolution (direct / PAC / system / policy)
     -> host resolution (DNS/cache/secure resolver)
        -> transport connect (TCP or QUIC)
           -> TLS / certificate / ALPN, or QUIC crypto handshake
              -> HTTP/1.1, HTTP/2 or HTTP/3 session/pool
                 -> request/response, cache and connection reuse
```

同一个 host 的请求未必使用同一条 socket：NetworkContext、privacy/network isolation key、proxy route、协议协商、connection coalescing、优先级和 session 状态都会影响复用。反过来，看到一个 HTTP 200 也不证明 DNS、TLS 或 proxy 没有在前面发生降级/重试。

## DNS 与 Proxy：在连接前已经决定了可达性与身份边界

`net/dns/host_resolver_manager.*` 管理 hostname resolution 的请求与 job；`net/proxy_resolution/` 的 config/service 处理系统、固定、PAC 或 policy 提供的代理配置与选择。它们属于 Browser/Network Service 的决策面，不应由网页脚本、Extension 或 Runtime 私自替换。

| 故障 | 不能直接归因 | 最小证据 |
| --- | --- | --- |
| 域名打不开 | “服务器宕机” | resolver 选择、DNS result/cache、IPv4/IPv6、proxy/PAC、网络隔离上下文 |
| 直连可用、浏览器不可用 | “Chromium 网络栈坏了” | effective proxy config、认证、bypass rule、企业 policy、PAC 执行结果 |
| 代理返回连接错误 | “TLS 证书错误” | CONNECT/代理路由、代理认证、对端 DNS 与后续 TLS 阶段 |

代理不仅是路由优化，也会改变哪个主体看见域名、请求元数据和连接。产品若支持企业代理或 TUN/本机代理，应将配置来源、优先级、PAC、认证、日志脱敏和故障降级写成可验证 contract；不要只在某个 Runtime 进程里设置环境变量后宣布浏览器流量已受控。

## TLS：安全连接的结果不等于“有个锁图标”

`net/socket/ssl_client_socket_impl.*` 负责 TLS client socket 路径，HTTP session 决定上层如何使用已建立连接。证书链、hostname、有效期、系统/企业信任、revocation/feature、ALPN 和协议版本都会影响结果。TLS 成功说明当前连接通过了当前验证策略；它不意味着页面内容可信、网站业务身份正确，或其他 NetworkContext/代理路径会相同。

排查 `ERR_CERT_*`、握手失败或偶现连接问题时，应记录 host、proxy route、证书摘要/错误类型、TLS/ALPN 协商、系统信任状态、时间和网络环境。日志不应保存私钥、cookie、Authorization、完整 URL query 或用户页面内容。企业根证书、代理 MITM 与产品 policy 都是安全变更，不能用“开发机装证书后能访问”作为发布方案。

## HTTP session 与 QUIC：协议选择是动态的

`net/http/http_network_session.*` 组织 HTTP 网络 session、连接工厂与协议相关状态；`net/quic/quic_context.*`、`quic_session_pool.*` 处理 HTTP/3/QUIC session 的创建、复用与尝试管理。QUIC 使用 UDP 上的加密传输，HTTP/3 建立在其上；它不是把 HTTP/2 的一个开关改成 true。

| 层次 | 需要回答 | 常见误解 |
| --- | --- | --- |
| TCP connect | 能否到达目标 endpoint | 成功后 HTTP 一定成功 |
| TLS/ALPN | 安全握手与 HTTP 协议协商 | TLS 成功后一定选 H2/H3 |
| HTTP/2 session | 多 stream 复用与服务器协商 | 每个请求都有独立 socket |
| QUIC/H3 session | UDP/QUIC handshake、迁移/复用与 fallback | 启用 QUIC 后所有请求都走 H3 |

网络 feature、服务器 Alt-Svc、代理兼容性、UDP 受限、NAT/防火墙与连接错误都会令实际路径回退或变化。性能比较应固定网络条件、缓存、服务器配置、协议证据与重复样本；“我看到一次 H3”不能推出整体延迟改善。

## 追踪任务与源码锚点

| 主题 | 源码入口 |
| --- | --- |
| DNS | `net/dns/host_resolver_manager.*` 及 request/job 实现 |
| Proxy | `net/proxy_resolution/proxy_config_service.*`、`proxy_resolution_service.*` |
| HTTP/TLS | `net/http/http_network_session.*`、`net/socket/transport_connect_job.*`、`ssl_client_socket_impl.*` |
| QUIC/HTTP3 | `net/quic/quic_context.*`、`quic_session_pool.*`、attempt/job 实现 |

1. 使用 netlog/trace 关联一条 request 的 proxy、DNS、connect、TLS/QUIC、HTTP session 和 response；不要只看 DevTools waterfall。
2. 分别在 direct、系统代理/PAC、企业代理、IPv4/IPv6、UDP 受限网络和 normal/OTR/不同 partition 中验收。
3. 对证书、代理认证、H3 fallback、连接复用和 retry 制作稳定测试；记录可公开的错误类别而不是敏感 payload。
4. Signed Distribution 上核验默认 endpoint/policy/feature，真实旧客户端升级后复测网络配置迁移。

## 工程推演：同一个 URL 偶尔快、偶尔超时，怎样避免盲猜

先固定 request identity、NetworkContext、Profile/partition、代理配置和时间窗口，再从 NetLog 中按阶段检查。若慢在 proxy resolution，需要看 PAC 获取与执行、系统配置刷新或认证；慢在 DNS，需要看 cache、secure resolver、IPv4/IPv6 与 isolation key；慢在 connect/TLS，则要比较 endpoint、握手重试、证书校验和 ALPN；HTTP 层才继续看连接复用、H2 stream、QUIC attempt/fallback 与服务端响应。

这个顺序很重要。关闭 QUIC 后“看起来好了”只能说明路径发生变化，不能证明 QUIC 是根因；强制 HTTP/1.1 也可能只是绕过了一个不稳定代理的 HTTP/2 行为。修复需要对应到可重复阶段，并验证 direct/代理、冷/热连接、normal/OTR、IPv4/IPv6 和目标平台，而不是把调试 flag 永久写入产品默认值。

对 Agent/Runtime 发出的业务 HTTP 请求，也应明确它并不自动继承 Browser 的 cookie、NetworkIsolationKey、证书 UI、DevTools 可见性或企业 proxy policy。若产品确实要求“代表当前页面网络身份”，这已是 Browser 安全 contract，而不是复制 header 或 cookie 即可完成。

## Proxy 决策发生在连接之前

系统代理、命令行、企业 Policy、PAC 与 direct fallback 可能共同决定路由。PAC 本身需要获取、执行和缓存，还可能根据 URL/host 返回不同代理链；代理认证又会引入 Browser UI、credential 与重试。

## DNS 结果还受网络隔离与缓存影响

Host resolution 可能经过系统 resolver、DoH、缓存、secure DNS policy 和网络变化处理。相同 hostname 的结果会受 NetworkAnonymizationKey/partition、address family、TTL 和连接上下文影响；清除 OS DNS cache 未必清除 Chromium 内部状态，反之亦然。

NetLog 中应对齐 resolver source、cache hit、query type、result/address 与错误。若解析成功但连接超时，继续看 address attempt、Happy Eyeballs、socket pool 与 proxy tunnel，不要停在“DNS 正常”。

## Socket pool 与 session 复用解释了“第二次不一样”

Chromium 会按 destination、proxy、privacy/isolation、network 与协议等条件复用连接。第二次请求可能复用 H2 session、已有 QUIC connection 或 warm socket，因此延迟与首次请求不同；连接失效、IP 变化或 network change 又会触发重新建立。

性能比较必须区分 cold DNS/connect/TLS 与 warm reuse。故障只在复用连接出现时，可能涉及 GOAWAY、idle timeout、stale socket、迁移或服务端连接策略；只重复刷新页面而不记录 connection/session id，会把关键差异丢掉。

## TLS 成功包含多步安全判断

TLS handshake 涉及版本、cipher、SNI、证书链、信任、hostname、时间、revocation/CT 等策略与 ALPN。公司代理或安全软件可能进行 TLS interception，使系统工具与 Chromium 使用不同 trust path。忽略证书错误或全局关闭校验只能绕过症状，不能作为修复。

定位时记录 net error、certificate status、issuer/chain、ALPN、proxy tunnel 和系统时间，避免输出私钥或敏感 credential。若只在某平台失败，需要比较平台 trust store、企业 policy 和目标 Chromium baseline，而不是复制另一平台证书目录。

## H1、H2 与 H3 的失败形态不同

HTTP/1.1 以连接为主要并发单元；H2 在一个 TLS connection 上 multiplex stream；H3 基于 QUIC/UDP，支持不同握手和迁移特征。协议协商与 fallback 是动态的，同一 URL 在网络环境变化后可能走不同路径。

“禁用 QUIC 后好了”只说明 H3/UDP 路径相关，还需要区分网络阻断、server implementation、migration、MTU 或 Chromium bug。最终策略应保留可控 fallback 和证据，而不是永久关闭整个协议来掩盖局部环境。

## 从 DevTools 错误到传输层证据

DevTools Network 适合看 request/response、timing 和页面语义；NetLog 才能展开 proxy、DNS、socket、TLS、H2/H3 session。系统抓包能观察线上 bytes，却看不到 Chromium 内部 isolation key、cache decision 和 policy；三者应按问题组合。

一次可交接报告至少包含目标 URL 的脱敏形式、时间窗口、Profile/network、proxy mode、DNS result、connect/TLS/ALPN、protocol/session、net error 与是否复用。这样“偶发超时”才有可比较样本。

## 工程结论

网络排障的最小单位不是 URL，而是“某个 NetworkContext 中一次带完整路由决策的请求”。只有把代理、DNS、transport、TLS、协议和 session 证据串起来，才知道修复应落在网络环境、产品 policy、Runtime 还是 Chromium Kernel。

## 继续阅读

- [19-Extension Runtime、MV3 与注入边界：扩展不是常驻页面脚本](/blog/0a08e5b4f498a778): 相邻章节的前置机制。
- [21-内存、分配器、崩溃与可靠性：从一次 OOM 到可行动的证据链](/blog/2617f1c2dd9466ce): 相邻章节的后续机制。

## 上游源码入口

文中的相对源码路径可从 [Chromium 官方上游快照](https://chromium.googlesource.com/chromium/src/+/b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b/) 定位。此入口保留原稿的上游阅读坐标，不包含任何产品定制代码，也不替代运行时验收。
