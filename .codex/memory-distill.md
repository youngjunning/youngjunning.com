# 硅基俊宁公开目标

根目录为本文件上一层目录（..）。主体为俊宁，站名硅基俊宁，正式域名 youngjunning.com。先读取 AGENTS.md、content/README.md 与 lib/model.mjs。

个人记录写入 content/records.json，version: 2；字段和专有类型与硅基紫升一致。正文/标题/背景映射 text/title/context，类型 experience/project/judgment/change/thought。id 为 16 位小写十六进制稳定 ID，跨目标同步保留原 ID。date 是发生日期，未知为 null，recordedAt 是录入日期。sources.kind 为 statement/archive/article，label 仅保存可公开来源。未知理由写明，未知备选为空数组、结果为 null。修复保留 ID，真实变化新增关联 change。

收藏独立写 content/favorites.json，version: 1。kind 为 project/knowledge/card，explicit 仅表示本人明确收藏，Agent 发现使用 discovered。按原始 URL 去重；card 的 url 为 null，并映射 date、recordedAt、context、understanding、example、distinction。收藏不作为本人参与、认可或掌握的证据。

参考资料和概念笔记独立于个人记忆判断，合格会话发现内容可按既有授权自动保存。通用概念笔记不要求本人已掌握，在 context、sources 中标明资料整理或 AI 辅助解释，understanding 承载概念要点；声称本人理解、判断或实践时才要求本人证据。仅出现术语或重复资料摘要时不新增笔记，同概念补全纠错保留 ID。未配置一种类型只限制该类型，不跳过其他分支。

external 项目只写本目标；internal 项目仅接收已脱敏公开版本，原始证据、摘录、会话位置和跨目标映射保留内部。unknown 只输出候选。原始来源不适合公开时用“本人陈述，日期，公开摘要”，不要把不可访问内网链接改写成虚构公共链接。不在本仓库创建原始证据 archive。仅使用 shared，拒绝 private；所有源文件均公开。

写入前读取现有数据，按事件、对象、立场、出处和 URL 去重，保留并行修改。完成后执行 npm run content:check 和 npm test，回读对应数据；有运行服务时检查 /records/:id、/api/records/:id 或 /favorites 与 /api/favorites，没有服务则如实报告页面未验收。应用修改再执行 typecheck 与 build。验证后自动提交并推送本任务内容，单独报告部署状态。

## Skills 公开同步

每轮核对个人记录、收藏以及 Skills 的合格增量和已知待同步项。Skills 独立存入 `content/skills.json`，格式为 `{ "version": 1, "updatedAt": "YYYY-MM-DD", "skills": [] }`。条目字段为 id（16 位小写十六进制稳定 ID）、name（可公开名称或泛化标题）、summary（独立可读的用途）、group（self/adopted）、sourceUrl（已核验的公共来源或 null）。这些数据说明维护或引入的工具，不作为本人经历、熟练程度或认可的证据。

内部名称与公开 ID 的映射只留内部目标；本目标不存内部名称、安装路径、主机、原始指纹、会话标识、凭证或源码。内部条目被删除或纠正时核对对应公开条目，保留仅在本站独立维护的内容。原名包含内部项目身份时使用泛化标题；无法在脱敏后保留真实用途则跳过并说明，不编造公共来源。

公开版本经逐项审阅后写入，执行既有内容检查、测试和类型检查，回读核对后按本目标授权提交并推送。无差异不重复写入；公开同步失败必须单独报告，下轮继续核对。数据同步、页面展示与部署分别报告。

## 收藏分级与项目使用

放宽收藏门槛：与当前任务相关且有潜在复用价值、可追溯原始来源的项目或资料，即可按 URL 去重收录为 discovered；不要求已经试用、选用或形成个人判断。仅列出待选方案不是跳过理由。没有验证的能力明确标为待核验，不把搜索摘要写成已证实结论。

收藏增加 priority（lead 线索、evaluate 待评估、reference 重点参考）、adoption（unknown 未核实、not_selected 未选用、trial 试用中、adopted 已选用、retired 已停用）、usages 数组。优先级是回看顺序，不是质量评分。历史缺证据默认 lead / unknown / []；明确仅作为候选才标未选用。

usages 每项包含 project、projectUrl、stage（trial/adopted/retired）、purpose、evidence。项目使用必须有源码、依赖、公开文档或明确陈述依据，区分原型试用和正式采用；试用中或已选用必须存在同阶段使用记录。更新时保留稳定 ID。公开使用记录不得暴露内部项目名称和地址，不能公开的关系仅留内部。图谱用 uses 表达项目使用，用 tagged 表达主题相关，不从相同标签推导使用事实。
