# 内容协议

硅基俊宁沿用硅基紫升的个人记录与收藏语义，公开内容独立存储。所有进入此仓库的内容都必须适合公开阅读，包括草稿、元数据和 Git 历史。

双站 schema、蒸馏方案、模块一致性与双向受众审查以 [双站内容与模块协议](sync.README.md) 为准。公司站也有独立的个人隐私边界，本站已公开的求职或私人信息未经针对公司读者的授权不得反向同步。

## 个人记录

`records.json` 顶层为 `{ "version": 2, "records": [] }`。类型为 experience、project、judgment、change、thought。通用字段为 id、kind、title、text、context、date、recordedAt、visibility、articleId、projectId、relatedIds、sources。id 使用 16 位小写十六进制稳定 ID；visibility 只能为 shared。

text 必须离开聊天仍可读。date 是发生日期，格式为 YYYY-MM-DD，未知或只有年月时为 null，在 context 保留原精度；recordedAt 是录入日期。articleId、projectId 未关联时为 null；relatedIds 未关联时为空数组。sources 为非空数组，字段为 kind（statement/archive/article）、label；article 来源另含有效 articleId。

experience 增加 period、start、end、ongoing，start/end 支持年、月、日或 null。project 增加 label、role、tags、status（ongoing/completed/paused/unknown）、goal、outcomes，未核验成果不填入 outcomes。judgment 增加 basis、alternatives、outcome，理由未知应说明，备选未知为空数组，结果未知为 null。change 增加 subjectId、before、after、reason，保留历史并关联原记录。

按同一事件、对象、立场和出处去重。补全上下文与错字修正保留 ID；真实变化新增 change。跨内部与公开目标的同一记录保留 ID，不把未完成事项写成既有结果。

## 百宝箱

`favorites.json` version 2 区分外部资源（tool/reference）与知识笔记（concept/method），共同按主题浏览；保存方式、表达归属和实际项目使用分别记录。完整字段、来源、去重、最小笔记、文章术语关系和迁移验收见 [favorites.README.md](favorites.README.md)。所有内容先通过公开受众审查，旧 ID、保存日期和定位锚点保留。

## 文章

正文只放 `posts/中文标题.md`。frontmatter 包含 id、title、description、date（引号包裹的 YYYY-MM-DD 或 null）、topic、tags，可选 draft: true。topic 为 principles、architecture、engineering、diagnostics、reflections。稳定 ID 用于 `/blog/:id`。草稿排除阅读、搜索、API 知识源与 sitemap；草稿源码仍必须完成脱敏。封面与附件使用公开可访问的资源或本仓库 public 内的资源，不引用内部 CDN。

修订已有文章时，在正文开头维护读者可见的 `## 修订记录`，使用「版本｜修订时间｜修订内容」表格，最新修订在前，保留已有条目。文字、事实、配图、链接和元数据的修订都记录，摘要写清实际变化。新文章首次发布可写「初稿」；只有证据支持时才填写历史日期。版本号沿用文章已有编号，没有编号时用「第 1 次修订」等顺序标记；日期不明写「日期不详」，不倒推历史。格式示例见下文：

```markdown
## 修订记录

| 版本 | 修订时间 | 修订内容 |
| --- | --- | --- |
| 第 1 次修订 | 2026.11.04 | 修正示例并补充适用边界。 |
| 初稿 | 2026.10.25 | 首次发表。 |
```

迁移文章的正文修订仍需同步维护 `migrationNote`、原文指纹和迁移清单；修订记录不能代替这些校验资料。公开修订记录本身也要通过受众与脱敏审查。

Markdown 正文的加粗优先只包含文字，将句末标点放在结束标记之后，例如 `**重点**。后文`，不要写成 `**重点。**后文`，也不要靠额外空格绕过解析边界。引号包住加粗文字时使用 `“**重点**”`。`content:check` 使用与阅读页一致的 Markdown 解析器，检查正文中因标点边界而未识别的成对加粗标记，并报告文章与行列位置；跳过代码、转义文本、链接地址和已按字节核验的逐字历史迁移稿。修订过的迁移稿同样执行检查。

## 已公开博客的原文迁移

2026-11-01，作者明确要求从 blog.zisheng.pro 筛选有价值的文章，并确认该公开博客无需脱敏。此次 81 篇保留署名、引用、历史日期及原有技术示例；迁入时 80 篇正文逐字保留，1 篇仅将 GitHub 拦截的一处历史 npm 令牌替换为占位符，并在文章及迁移清单注明。链接、图片和排版在渲染层适配。适用范围由 `blog-migration-2026-11-01.json` 的源提交、文章 ID、原始内容及导入文件的 SHA-256 固定。校验器只对完全匹配的已审阅版本允许历史示例中的路径与 localhost，不将例外扩展到其他文章、记录、收藏或后续改写。凭证检查仍保留。后续修订保留原文指纹，以 `migrationNote` 与迁移清单注明变动并更新已审阅版本的指纹；正文与原始指纹不同的修订稿须通过 Markdown 加粗检查。

逐篇取舍见 `docs/博客文章迁移清单-2026-11-01.md` 和 `/blog/migration`。资源来源与内容指纹另存于 `blog-migration-assets-2026-11-01.json`；无法读取的历史图片保留原始链接并在页面标注。原文没有可用封面时补独立标题封面，不把正文配图挪作封面。

## 原官网学习笔记迁移

93 份页面源稿与草稿的取舍见 `website-migration-2026-11-01.json`、`docs/官网知识库迁移清单-2026-11-01.md` 和 `/blog/website-migration`：11 篇迁入，2 份转为参考资料，80 份不迁移。公开仓库只保存经审阅的学习内容；私有原始位置与工作区证据留本机迁移归档。保留译文归属，不补造发布日期，勘误与格式适配逐项列明；这些文章继续使用常规公开内容检查，不扩大历史博客的校验例外。正文及本地图片的指纹随迁移清单校验。

## Skills 清单

`skills.json` 保存经过脱敏审阅的技能用途摘要，格式为 `{ "version": 1, "updatedAt": "YYYY-MM-DD", "skills": [] }`。每项具有稳定 id、公开 name、summary、group（self/adopted）和 sourceUrl（公共来源或 null）。不保存内部原名映射、安装位置、原始指纹、源码和凭证。清单不代表本人使用频率、熟练程度或对引入工具的认可。此数据文件与个人记录、收藏独立维护。

## 公开同步规则

内部原始记录与精确证据保留内部目标。公开前删除或泛化内部项目、团队、客户、账号标识、内网链接、本地路径、未公开指标、会话 ID、凭证与私密数据。公开 sources.label 使用“本人陈述，日期，公开摘要”或正式公共出处；不伪造公开来源。脱敏后保留问题、参与范围、本人选择、理由、已验证结果及未知项；语义无法保真时跳过公开同步。不同内容的同名条目不能直接合并。

`npm run content:check` 检查 schema、关系、日期、URL 去重与部分敏感标记。自动检查覆盖有限，仍需逐条阅读正文、元数据、文件名、附件与链接，不能把检查通过当作脱敏完整证明。新增敏感内容后再删除无法清除公开 Git 历史，因此必须在首次提交前检查。

## 已撤下的栏目

2026-11-08 起撤下探索清单与对话摘录，不再发布页面、API 或检索快照，也不再接收新条目。旧数据仅保留在 `archive/retired-curation-2026-11-08/`。

## 硅基俊宁专属内容

2026-11-01，作者曾指定 TaleFrame 一类个人独立产品文章只在本站维护和发布。2026-11-03，作者将面向读者的新文章首发顺序改为：除个人敏感内容外，先在硅基紫升内网发布；后续需要对外发表时，再审查并维护本站公开版。此前已公开文章保留原位，不因顺序调整自动迁移；两站之间仍不自动同步。个人敏感内容按获准受众处理，不因这条顺序进入公司站。

此前的单站约定已覆盖文章 `b7e91c4a20d865f3`《TaleFrame 架构实录：原生 Android 如何接上 Vercel 小说后台》的既有版本及关联封面；不因首发顺序调整自动回灌。后续如有非个人敏感的实质修订，先在内网维护适合公司读者的版本；公开版仍按需独立维护，不自动跨站同步。
