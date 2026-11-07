# 个人记录

`records.json` 是个人记忆的内容源，`version: 2`。经历、项目、判断和变化均有独立 ID，不要求先写一篇文章。想法继续保留；知识卡片统一维护在收藏夹；博客正文独立维护在 `posts/`，以可选的 `articleId` 关联。

## 记录类型

| kind | 内容 | 专有字段 |
| --- | --- | --- |
| `experience` | 学习、任职与参与经历 | `period` 原时间表述；`start`、`end` 支持年、月或日，未知为 null；`ongoing` |
| `project` | 目标、参与和结果 | `label`、`role`、`tags`、`status`、`goal`、`outcomes` |
| `judgment` | 当时的选择与依据 | `basis`、`alternatives`、`outcome` |
| `change` | 已有记录发生的变化 | `subjectId`、`before`、`after`、`reason` |
| `thought` | 当时的想法或原话 | 通用字段即可 |

项目 `status` 可为 `ongoing`、`completed`、`paused`、`unknown`；未核验的结果不填入 `outcomes`，不要从项目介绍推断已经完成。知识卡片的例子必须说明是假设还是实际经历。

## 通用字段

| 字段 | 含义 |
| --- | --- |
| `id` | 16 位小写十六进制稳定 ID；修改标题时保留 |
| `title`、`text`、`context` | 标题、内容、发生或表达的场景 |
| `date` | 发生日期，YYYY-MM-DD；未知或只知年月时为 null，由经历字段保留原精度 |
| `recordedAt` | 录入日期，不能冒充发生日期 |
| `visibility` | 本公开目标只接收 `shared`；`private` 不能进入公开源码 |
| `articleId` | 可选博客文章 ID，未关联时为 null |
| `projectId` | 可选所属项目的记录 ID，未关联时为 null |
| `relatedIds` | 其他明确关联的记录 ID 数组 |
| `sources` | 非空来源数组，包含 `kind` 和 `label`；文章来源另含 `articleId` |

来源类型为 `statement`（本人陈述）、`archive`（已有资料）、`article`（博客文章）。辅助归纳的说明不能写成本人逐字原话；未知信息保持未知，不推断健康、心理状态或个人经历。

## 新增与修订

### 从会话收录的内容门槛

使用全局 Skill `memory-distill`，按[本站接入](../.codex/memory-distill.md)处理公开合格增量；跨站内容按[双向审核协议](sync.README.md)生成接收版。首页可能只展示 `text`，因此正文必须独立说清讨论对象、本人表达的选择或观点，不能只放“应该都要做的”“按这个来”等指代性回复。`context` 和标题不能代替完整正文。

本人没有说明的理由、备选和结果保持未知；Agent 的提案不能冒充本人决定。精确原话、会话定位和审核映射只留获准私有位置，公开 `sources.label` 保存可公开陈述摘要或真实公共出处。普通任务进度、通用知识和工具生成的结论不自动成为个人判断或经历。

补全原记录的省略语义时保留 ID；只有本人立场或状态实际改变时才新增 `change`。当目标配置指向本站时，各业务仓库仅提供证据，统一维护这一份内容源；技能也支持其他目标或只输出模式。

1. 在 `records.json` 新增对应类型，生成新 ID，填写实际内容、时间精度、场景与来源。只有明确允许站内展示时使用 `shared`。
2. 项目、文章和其他记录分别按 ID 关联。新增关系不自动证明因果或个人贡献。
3. 判断或状态发生变化时，新增 `change` 并用 `subjectId` 指向原记录，写清之前、之后和原因；保留原记录。普通错字可直接修订。
4. 运行 `npm run content:check` 和 `npm test`。校验会拒绝重复 ID、无来源、非法日期、悬空关系、不完整变化以及共享记录对私有记录的引用。
5. 页面位于 `/records`、`/records/:id`，结构化快照位于 `/api/records`、`/api/records/:id`。生产环境需重新构建并部署后才会更新。

`private` 只是输出排除机制，源文件及其 Git 历史仍在仓库中。本项目尚未建立私密数据存储和个人身份鉴权，敏感健康与心理数据不要写入此文件。共享记录也只用于读取，不构成委托 Agent 执行操作的授权。
