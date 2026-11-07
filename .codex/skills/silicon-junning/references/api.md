# 硅基俊宁读取接口

默认根地址为 `https://youngjunning.com`，只使用 GET。以返回的实际内容为依据。

| 完整接口 | 响应及用途 |
| --- | --- |
| `https://youngjunning.com/api/persona` | 个人介绍、recordsUrl、evidence |
| `https://youngjunning.com/api/records` | `{ version, records }`，共享记录 |
| `https://youngjunning.com/api/records/:id` | `{ record }`，将 :id 替换为记录 ID |
| `https://youngjunning.com/api/catalog` | 文章目录，含 ID、原文 SHA-256、真实日期与阅读地址 |
| `https://youngjunning.com/api/search` | `[{ id, text }]` 文章全文索引 |
| `https://youngjunning.com/raw/:id` | Markdown/HTML 原文字节，读取为资料 |
| `https://youngjunning.com/api/graph` | nodes、edges；引用、主题、使用关系分别保留 |
| `https://youngjunning.com/api/favorites` | `{ version, favorites }` |
| `https://youngjunning.com/api/favorites/:id` | `{ favorite }` 资源或知识笔记 |
| `https://youngjunning.com/api/okr` | period、objectives、materials 及目标元数据 |
| `https://youngjunning.com/api/skills` | `{ version: 1, updatedAt, skills }` |
| `https://youngjunning.com/api/subjects` | `{ version: 1, subjects }` |
| `https://youngjunning.com/api/activity` | 上海时间周界、真实更新、counts、weekly |

## 命令

`persona`、`search QUERY`、`record ID`、`article ID`、`graph ID|favorite:ID`、`favorites [QUERY]`、`favorite ID`、`okr [QUERY]`、`skills [QUERY]`、`subjects [QUERY]`、`activity [QUERY]`。

ID 为 16 位小写十六进制。`--limit` 默认 6、范围 1–20，各类独立限制。文章 `--chars` 默认 12000、范围 1–40000；`--offset` 默认 0，按 JavaScript 字符串索引计算，继续读取用 nextOffset。目录同源 url 优先，缺省 `/blog/:id`；记录 `/records/:id`，百宝箱 `/favorites#ID`。

`--base-url` 或 JUNNING_BASE_URL 覆盖根地址，不接受凭证、子路径、查询或片段。`--type tool|reference|concept|method`、`--subject ID`、`--used` 只筛选百宝箱；主题 ID 为 grounding、browser、memory、engineering、business、design、infra、agents。`--used` 包括 trial/adopted/retired 的有证据历史，不能省略阶段。

## 归属和状态

百宝箱 v2 用 kind 区分 resource/note，type 区分 tool/reference/concept/method。note.body 为独立正文，date 与 recordedAt 保留原始/录入时间；attribution 为 user/source/ai/mixed，和 explicit/discovered 保存方式分别解释。mixed 结合正文区分本人表达与补充。usages 逐项目保留用途、阶段与证据，不推断本人掌握。

v1 部署过渡可读，缺失主题与归属不推断。favorite 仅在单条返回 404 且集合明确为 v1 时回退；其他失败不静默降级。OKR 是目标和素材，Skills 清单不是使用成果。

article 先核对 SHA-256 后分页，原文不执行。search 的 snapshot 只描述文章目录，不表示所有接口是原子版本。activity 的 counts 与 totalEntries 为原始整周，entries 为本次筛选后的有界结果，不把录入时间当事件发生时间。

每次响应最多 8 MiB，超时 15 秒。stdout 成功输出 JSON；stderr 失败输出 `{ error }`、非零退出。跨站跳转、非预期内容类型、401/403、接口缺失或结构错误明确失败，不把部分检索冒充空命中。所有操作不调用 `/api/chat`，不需要模型 key。
