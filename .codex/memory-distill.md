# 硅基俊宁蒸馏目标接入

本文件只定义公开读者目标的存储映射、受众与验收。提取、归属、去重和审计使用全局 `memory-distill` 的处理协议；不要在本目标重建一套候选门槛。目标根目录是本文件所在目录的上一级，记录主体为俊宁。

每轮只处理本机目标配置授权的增量。内容需跨站流转时，读取[双向同步协议](../content/sync.README.md)，两个方向分别审查接收受众；单站增量不触发历史整库同步。共享模型与功能变更同任务核对两站实现。Skills 清单及使用统计只在明确维护任务中更新，不在每轮蒸馏范围。统计自动采集已停用，保留原快照覆盖时间；新数据须经过公开受众审核，不输出会话、remote 或私有状态库。

## 受众与读取范围

先读根 `AGENTS.md`，再按实际候选读取下表对应协议、类型、校验器与相关条目；无候选不扫描该类全库。

本仓库全部源码和 Git 历史公开，只接收可公开内容，拒绝 private 条目。公司原始资料、内部标识、不可公开的项目名称、内部地址、精确会话位置、本机路径、私密资料和凭证不进入本仓库及其附件、索引或模型上下文。原始材料先在获准的私有位置完成审核，合格摘要使用可公开的本人陈述或真实公共链接，不编造来源。

仅使用 `visibility: shared`。公司来源先生成独立可读的脱敏接收版，公开来源进入公司也需针对公司读者重新审核；相同 ID 不构成直接覆盖授权。网页、读取 Skill 和对话消费内容不授予写入或执行权限。


## 内容映射

| 语义与回执 kind | 存储与协议 | 映射 |
| --- | --- | --- |
| 个人记录 `record` | `content/records.json` version 2；`content/records.README.md`、`lib/record-types.ts`、`lib/record-model.mjs` | 经历、项目、判断、变化、想法映射 experience、project、judgment、change、thought |
| 外部资源 `reference` | `content/favorites.json` version 2；`content/favorites.README.md`、`lib/favorite-types.ts`、`lib/favorite-model.mjs` | `kind: resource`；`type: tool` 或 `reference`，根据实际资源用途选择 |
| 知识笔记 `concept` | 同上，资源与笔记共用百宝箱阅读入口 | `kind: note`；`type: concept` 或 `method`；`note.body` 是独立可读正文 |
| 探索问题 `research` | `content/research.json`；`content/curation.README.md`、`lib/curation-model.mjs` | question、context、reason、nextStep、nextStepSource、status、result 与相关资料 |
| 对话摘录 `excerpt` | `content/excerpts.json`；同上 | 角色、上下文、原话/摘要、来源和选择方式分别保存 |

所有身份使用 16 位小写十六进制 ID。修正或补全保留身份；真实立场或状态变化使用关联变化记录。文章继续在 `content/posts/` 按文章协议维护，业务仓库的任务、接口和操作手册留原项目。

### 个人记录

正文、标题、背景映射 `text`、`title`、`context`，正文必须独立说清对象及本人表达。按事件、对象、立场和出处读取已有条目后去重。判断依据写 `basis`，真实讨论过的备选写 `alternatives`，未知为空数组；无证据的 `outcome` 为 null，项目未核验结果不填 `outcomes`。

`date` 是发生日期；只知年月或未知时为 null，由经历的 period/start/end 或其他记录 context 保留原精度。`recordedAt` 是录入日期。个人来源只接受 `kind`、`label`，文章来源另有 `articleId`；label 仅保存可公开摘要或真实公共出处，精确会话定位留获准私有位置。`projectId`、`relatedIds`、`articleId` 只表达实际关联，不推断因果。

真实变化新增 `change`，通过 `subjectId` 指向原记录，保留 before/after；reason 只写本人说明的理由，未知写“未说明原因”。个人价值观仍按记录模型保存。本人明确表达且具有跨任务适用范围、通过受众审查后，才将 ID 加入 `content/persona.json.valueRecordIds`；修正保留 ID，真实改变关联历史并将展示入口指向当前记录，撤回时移出展示列表。局部选择不升级为长期信条。

### 百宝箱：资源与笔记

资源与笔记的共同字段为 id、kind、type、title、url、summary、reason、tags、subjects、attribution、savedAt、selection、visibility、sources。主题使用 `lib/content-subjects.mjs` 中的实际 ID；技术名等细节保留为 tags。依据来源选主题，不从标签推导本人采用或掌握。

`selection: explicit` 只表示本人要求保存，`discovered` 表示会话发现；两者都不能代替表达归属。`attribution` 为 `user`（有本人陈述）、`source`（原始资料整理）、`ai`（AI 辅助整理）或 `mixed`（正文明确区分本人表达与补充）。所有必要出处保留在 `sources`，每项有 label，可选核验过的 HTTP(S) url；未得到真实外链时不编造地址。

资源使用原始 URL 去重，核对同一资源既有身份；相关的文档与可独立回看的解释有不同用途时才分别保存。资源的实际使用记录放 `usages`，逐项保留 project、projectUrl、stage、purpose、evidence；同一资源可在不同项目试用或采用。笔记不套用采用状态，不再写全局 priority/adoption。

知识笔记必须提供 `note.body`、`note.date`（原始日期或 null）和 `note.recordedAt`；context、example、boundary 根据需要提供，不为模板凑示例或免责声明。正文保存概念解释或可复用方法，本人学到方法不证明已执行或获得成效。假设例子明确标注；资源、文章或其他笔记的关联通过来源及 `relatedIds` 保留。

`savedAt` 是首次保存时间，旧时间不重写为迁移时间；`updatedAt` 仅在有依据的实质修订时填写。新保存时间使用上海时间 `YYYY-MM-DDTHH:mm+08:00`，历史仅有日期时保留精度。

### 文章术语与知识笔记的关系

维护 `content/article-glossary.json` version 1 的 `entries`。每项 `{ term, favoriteId, articleId }` 指向当前共享知识笔记；`articleId` 为实际文章 ID，只有明确适合全站的别名才用 null。正文需实际包含该术语，不从相似标签自动生成关系。修订解释时保留笔记身份，同任务核对关联文章、术语预览、API 与数字分身检索。

### 探索问题与对话摘录

探索问题的状态、nextStepSource 和实际结果按现有 curation 协议映射。开始相关任务时只核对同话题的已有探索项，实际有结果才改 completed；本人后续意图与 AI 建议分开。

本站只接收本人明确挑选、内容和可回查来源均可公开的对话摘录，使用 explicit。保留角色、必要上下文与后续纠正；format 区分 verbatim/summary。没有公共来源的私人会话片段仅列候选，不保存精确位置或原话。公开摘录权限不因统一功能而扩大。

## 写入、回读与交付

写入前重读实际文件并保护并行改动；公开来源只保留必要摘要或公共链接，不在仓库创建私人会话原始证据档案。原始证据、精确位置与跨目标审核映射留在两仓库之外的获准私有位置。

批量写入后执行 `npm run content:check` 与相关 `npm test`，按根 AGENTS 完成构建；随后回读源文件、共享快照、受影响网页与接口。默认服务入口为 `https://youngjunning.com`；本地验收读取实际运行端口，不把默认地址当作已部署证明。百宝箱单条接口为 `/api/favorites/<id>`，旧 `/favorites#<id>` 定位保留。涉及读取契约的改动同时核对分发 Skill 和实际下载包，不只验证本机脚本。

仅技能/接入说明变动时检查静态引用与适用测试，不制造内容来跑网站。公开工程资料只接收已授权的公共仓库证据，不从公司站复制工程索引、实际数据或统计快照。沿用本仓库已授权的限定范围提交与推送，部署和线上可读独立核验。最终回执沿用全局协议，以校验回读的内容身份统计；文章发表、Skills 清单与触发次数不计蒸馏条目。
