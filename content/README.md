# 内容协议

硅基俊宁沿用硅基紫升的个人记录与收藏语义，公开内容独立存储。所有进入此仓库的内容都必须适合公开阅读，包括草稿、元数据和 Git 历史。

## 个人记录

`records.json` 顶层为 `{ "version": 2, "records": [] }`。类型为 experience、project、judgment、change、thought。通用字段为 id、kind、title、text、context、date、recordedAt、visibility、articleId、projectId、relatedIds、sources。id 使用 16 位小写十六进制稳定 ID；visibility 只能为 shared。

text 必须离开聊天仍可读。date 是发生日期，格式为 YYYY-MM-DD，未知或只有年月时为 null，在 context 保留原精度；recordedAt 是录入日期。articleId、projectId 未关联时为 null；relatedIds 未关联时为空数组。sources 为非空数组，字段为 kind（statement/archive/article）、label；article 来源另含有效 articleId。

experience 增加 period、start、end、ongoing，start/end 支持年、月、日或 null。project 增加 label、role、tags、status（ongoing/completed/paused/unknown）、goal、outcomes，未核验成果不填入 outcomes。judgment 增加 basis、alternatives、outcome，理由未知应说明，备选未知为空数组，结果未知为 null。change 增加 subjectId、before、after、reason，保留历史并关联原记录。

按同一事件、对象、立场和出处去重。补全上下文与错字修正保留 ID；真实变化新增 change。跨内部与公开目标的同一记录保留 ID，不把未完成事项写成既有结果。

## 收藏

`favorites.json` 顶层为 `{ "version": 1, "favorites": [] }`。每项包含 id、kind（project/knowledge/card）、title、url、summary、reason、tags、savedAt、selection、visibility、sources。selection: explicit 仅用于本人明确收藏，Agent 发现使用 discovered；sources 为非空的 `{ "label": "公开出处" }` 数组。

URL 应为可核验公共原始来源，按移除锚点、utm 参数与尾斜杠后的地址去重，保留有语义查询参数。概念笔记 kind: card，url 为 null，另含 card: {date, recordedAt, context, understanding, example, distinction}，示例区分假设与真实经历。通用笔记可自动保存有来源的完整概念解释、示例和适用边界，context、sources 注明资料整理或 AI 辅助解释，understanding 承载概念要点；仅声称本人理解、判断或实践时要求本人证据。没有个人事实不影响资料或笔记的收藏判断；已授权的合格内容按 discovered 保存，不要求本轮再次明确收藏。按概念、范围和来源去重，补全纠错保留 ID，不为单纯术语提及或重复外链摘要制造笔记。

## 文章

正文只放 `posts/中文标题.md`。frontmatter 包含 id、title、description、date（引号包裹的 YYYY-MM-DD 或 null）、topic、tags，可选 draft: true。topic 为 principles、architecture、engineering、diagnostics、reflections。稳定 ID 用于 `/blog/:id`。草稿排除阅读、搜索、API 知识源与 sitemap；草稿源码仍必须完成脱敏。封面与附件使用公开可访问的资源或本仓库 public 内的资源，不引用内部 CDN。

## 已公开博客的原文迁移

2026-11-01，作者明确要求从 blog.zisheng.pro 筛选有价值的文章，并确认该公开博客无需脱敏。此次 81 篇保留署名、引用、历史日期及原有技术示例；80 篇正文逐字保留，1 篇仅将 GitHub 拦截的一处历史 npm 令牌替换为占位符，并在文章及迁移清单注明。链接、图片和排版在渲染层适配。适用范围由 `blog-migration-2026-11-01.json` 的源提交、文章 ID、原始内容及导入文件的 SHA-256 固定。校验器只对完全匹配的已审阅版本允许历史示例中的路径与 localhost，不将例外扩展到其他文章、记录、收藏或后续改写。凭证检查仍保留。

逐篇取舍见 `docs/博客文章迁移清单-2026-11-01.md` 和 `/blog/migration`。资源来源与内容指纹另存于 `blog-migration-assets-2026-11-01.json`；无法读取的历史图片保留原始链接并在页面标注。原文没有可用封面时补独立标题封面，不把正文配图挪作封面。

## Skills 清单

`skills.json` 保存经过脱敏审阅的技能用途摘要，格式为 `{ "version": 1, "updatedAt": "YYYY-MM-DD", "skills": [] }`。每项具有稳定 id、公开 name、summary、group（self/adopted）和 sourceUrl（公共来源或 null）。不保存内部原名映射、安装位置、原始指纹、源码和凭证。清单不代表本人使用频率、熟练程度或对引入工具的认可。此数据文件与个人记录、收藏独立维护。

## 公开同步规则

内部原始记录与精确证据保留内部目标。公开前删除或泛化内部项目、团队、客户、账号标识、内网链接、本地路径、未公开指标、会话 ID、凭证与私密数据。公开 sources.label 使用“本人陈述，日期，公开摘要”或正式公共出处；不伪造公开来源。脱敏后保留问题、参与范围、本人选择、理由、已验证结果及未知项；语义无法保真时跳过公开同步。不同内容的同名条目不能直接合并。

`npm run content:check` 检查 schema、关系、日期、URL 去重与部分敏感标记。自动检查覆盖有限，仍需逐条阅读正文、元数据、文件名、附件与链接，不能把检查通过当作脱敏完整证明。新增敏感内容后再删除无法清除公开 Git 历史，因此必须在首次提交前检查。

## 收藏分级与项目使用

放宽收藏门槛：与当前任务相关且有潜在复用价值、可追溯原始来源的项目或资料，即可按 URL 去重收录为 discovered；不要求已经试用、选用或形成个人判断。仅列出待选方案不是跳过理由。没有验证的能力明确标为待核验，不把搜索摘要写成已证实结论。

收藏增加 priority（lead 线索、evaluate 待评估、reference 重点参考）、adoption（unknown 未核实、not_selected 未选用、trial 试用中、adopted 已选用、retired 已停用）、usages 数组。优先级是回看顺序，不是质量评分。历史缺证据默认 lead / unknown / []；明确仅作为候选才标未选用。

usages 每项包含 project、projectUrl、stage（trial/adopted/retired）、purpose、evidence。项目使用必须有源码、依赖、公开文档或明确陈述依据，区分原型试用和正式采用；试用中或已选用必须存在同阶段使用记录。更新时保留稳定 ID。公开使用记录不得暴露内部项目名称和地址，不能公开的关系仅留内部。图谱用 uses 表达项目使用，用 tagged 表达主题相关，不从相同标签推导使用事实。
