# 周刊行业动态：AIHOT 候选与原文核对

两站共用这套维护流程。硅基俊宁面向公开读者，硅基紫升面向公司读者；各自的文章、收藏和记录只从本目标当周已获准的内容选取。行业动态是独立栏目，入口为 `/aihot`，不归入百宝箱，也不因周刊选稿自动生成收藏或知识笔记。行业动态须分别审查受众，公开来源不自动适合公司披露。

## 取候选

使用 Node.js 22.21 或更新的 22.x（或支持 `--use-env-proxy` 的后续 LTS）。命令通过 Node 原生开关读取现有 `HTTP_PROXY`、`HTTPS_PROXY` 与 `NO_PROXY`，没有代理配置时按默认网络访问；不在项目里保存代理地址或凭证。此开关只影响维护命令，不改变网站服务的网络设置。原生支持版本见 [Node 发布说明](https://nodejs.org/en/blog/release/v22.21.0)与[企业网络配置](https://nodejs.org/learn/http/enterprise-network-configuration)。

```sh
npm run weekly:industry
npm run weekly:industry -- --from 2026-11-02 --to 2026-11-08
```

脚本按北京时间限定本周（或指定日期），请求 AIHOT `/api/v1/items?mode=selected&window=7d&by=published&limit=100`，按不透明 cursor 顺序翻页，并参考同期 `/api/v1/weeklies/latest`。只读、按需运行；ETag 与响应留在被 Git 忽略的 `.cache/aihot-weekly/`，按响应的 `Cache-Control: s-maxage`（或 `max-age`）复用缓存，至少间隔一分钟；到期带 `If-None-Match`，304 续用原响应。脚本不在构建、线上请求或后台定时运行，也不写入文章、收藏和记忆。

输出中的 `coverage` 给出滚动窗口起点、扫描页数与条数、是否仍有下一页。单次最多 20 页，存在下一页时明确提示覆盖不完整；最多输出相关度最高的 20 条候选。`warnings` 区分请求超出最近 7 天、候选为空与最新周报日期不匹配；周报单独失败会保留 `weekly.unavailable`，资讯请求失败则退出非零。7 天窗口无法补齐更久以前的历史，空候选也不代表本周没有行业动态。

输出保留 AIHOT 页面、原始链接、来源与时间，只列与 Browser Agent、Computer Use、Agent Runtime、可靠性评测、AI 工作流相关的候选。关键词命中是**编辑待看清单**，不是事实核验或自动入选。它可能漏掉重要消息；每期还应检查官方发布与相关开源项目更新。

## 验证与故障处理

```sh
node --test scripts/weekly-industry.test.mjs
npm run weekly:industry
```

前一项验证日期边界、分页、来源保留、缓存和错误反馈；后一项需要实际网络访问，成功时 stdout 返回 JSON，包含 `candidates` 与 `coverage`。测试通过不等于实网取数成功。接口版本说明为 2.0.0，但路径仍为 `/api/v1`、响应 `schemaVersion` 仍为 1，三者分别核对。

需要机器读取纯 JSON 时使用 `npm run --silent weekly:industry`。直接运行文件也应保留网络开关：`node --use-env-proxy scripts/weekly-industry.mjs`。Node 22 的代理功能可能向 stderr 输出 experimental 提示，不影响 stdout JSON 或退出状态。

- 403 若来自本机或组织网络策略，按组织流程放行 `aihot.news` 后重试；若来自服务端，保留 HTTP 状态、`code` 与 `requestId` 排查。不换 User-Agent、代理或域名绕过。
- 429、503 显示 `Retry-After`，等待该间隔后再手动执行；脚本不会并发或自动重试。其他 HTTP 错误与结构变更明确失败，不使用过期数据冒充最新结果。
- 566、567 属于服务边缘安全拦截，保留 `requestId`，按官方接入说明退避并联系服务方。成功缓存以外的错误响应不会写入缓存。

双站分别运行同一脚本，各自审核和维护周刊；不由一站的成功推断另一站已经取数或发布。缓存仅用于本地维护，不提交到 Git，不进入站点构建、公开 API 或模型资料。

## 选稿与写稿

1. 把当期范围写清楚，核对每条消息**原始发布日**、原始公告、实际可用范围与关键接口或行为。发布日期不明、只有转述或无法核实的消息不写成确定进展。
2. 按与俊宁研究主线的关系排序：Browser Agent、Agent Runtime、Computer Use、云端执行环境及工程可靠性优先；通用模型或营销消息须有明确工作流影响才入选。每期选少量有不同影响的事件，合并同一事件的重复报道，避免“产品发布三连”。
3. 每项用自己的话回答“发生了什么、影响哪种真实任务、还缺哪项验证”，引用原始来源；AIHOT 仅作为发现线索，可附其页面以便回查，不复制其标题、摘要、推荐理由或周报综述。把官方确认和个人推测分开。
4. 周刊同时覆盖本站本周新增或实质修订的文章、百宝箱和个人记录；栏目中的个人判断只引用本人明确表达。题目提炼当期线索，不能由 AIHOT 的头条代替本站主题。
5. 发布前重新打开引用链接并核对撤回或更正。AIHOT 的精选评分不等于本站认可；如其条目已撤回，不依赖旧缓存继续引用。

AIHOT [接入说明](https://aihot.news/agent?tab=api)、[OpenAPI](https://aihot.news/openapi-v1.json) 与[使用规则](https://aihot.news/terms)。两站仅在维护阶段将其作为线索来源，不公开镜像、代理接口或批量分发其内容；用途改变时先核对授权范围。
