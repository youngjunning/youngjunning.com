# 内容协议

硅基俊宁沿用硅基紫升的个人记录与收藏语义，公开内容独立存储。所有进入此仓库的内容都必须适合公开阅读，包括草稿、元数据和 Git 历史。

## 个人记录

`records.json` 顶层为 `{ "version": 2, "records": [] }`。类型为 experience、project、judgment、change、thought。通用字段为 id、kind、title、text、context、date、recordedAt、visibility、articleId、projectId、relatedIds、sources。id 使用 16 位小写十六进制稳定 ID；visibility 只能为 shared。

text 必须离开聊天仍可读。date 是发生日期，格式为 YYYY-MM-DD，未知或只有年月时为 null，在 context 保留原精度；recordedAt 是录入日期。articleId、projectId 未关联时为 null；relatedIds 未关联时为空数组。sources 为非空数组，字段为 kind（statement/archive/article）、label；article 来源另含有效 articleId。

experience 增加 period、start、end、ongoing，start/end 支持年、月、日或 null。project 增加 label、role、tags、status（ongoing/completed/paused/unknown）、goal、outcomes，未核验成果不填入 outcomes。judgment 增加 basis、alternatives、outcome，理由未知应说明，备选未知为空数组，结果未知为 null。change 增加 subjectId、before、after、reason，保留历史并关联原记录。

按同一事件、对象、立场和出处去重。补全上下文与错字修正保留 ID；真实变化新增 change。跨内部与公开目标的同一记录保留 ID，不把未完成事项写成既有结果。

## 收藏

`favorites.json` 顶层为 `{ "version": 1, "favorites": [] }`。每项包含 id、kind（project/knowledge/card）、title、url、summary、reason、tags、savedAt、selection、visibility、sources。selection: explicit 仅用于本人明确收藏，Agent 发现使用 discovered；sources 为非空的 `{ "label": "公开出处" }` 数组。

URL 应为可核验公共原始来源，按移除锚点、utm 参数与尾斜杠后的地址去重，保留有语义查询参数。知识卡片 kind: card，url 为 null，另含 card: {date, recordedAt, context, understanding, example, distinction}，示例区分假设与真实经历。知识卡片需要本人理解的证据，不能把资料摘要冒充本人理解。

## 文章

正文只放 `posts/中文标题.md`。frontmatter 包含 id、title、description、date（引号包裹的 YYYY-MM-DD 或 null）、topic、tags，可选 draft: true。topic 为 principles、architecture、engineering、diagnostics、reflections。稳定 ID 用于 `/blog/:id`。草稿排除阅读、搜索、API 知识源与 sitemap；草稿源码仍必须完成脱敏。封面与附件使用公开可访问的资源或本仓库 public 内的资源，不引用内部 CDN。

## Skills 清单

`skills.json` 保存经过脱敏审阅的技能用途摘要，格式为 `{ "version": 1, "updatedAt": "YYYY-MM-DD", "skills": [] }`。每项具有稳定 id、公开 name、summary、group（self/adopted）和 sourceUrl（公共来源或 null）。不保存内部原名映射、安装位置、原始指纹、源码和凭证。清单不代表本人使用频率、熟练程度或对引入工具的认可。此数据文件与个人记录、收藏独立维护。

## 公开同步规则

内部原始记录与精确证据保留内部目标。公开前删除或泛化内部项目、团队、客户、账号标识、内网链接、本地路径、未公开指标、会话 ID、凭证与私密数据。公开 sources.label 使用“本人陈述，日期，公开摘要”或正式公共出处；不伪造公开来源。脱敏后保留问题、参与范围、本人选择、理由、已验证结果及未知项；语义无法保真时跳过公开同步。不同内容的同名条目不能直接合并。

`npm run content:check` 检查 schema、关系、日期、URL 去重与部分敏感标记。自动检查覆盖有限，仍需逐条阅读正文、元数据、文件名、附件与链接，不能把检查通过当作脱敏完整证明。新增敏感内容后再删除无法清除公开 Git 历史，因此必须在首次提交前检查。
