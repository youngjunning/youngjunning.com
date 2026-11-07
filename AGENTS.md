# 硅基俊宁

内外站保持同一套产品定位、栏目、主题与交互、内容契约、API 和读取 Skill；共享能力变更同任务核对另一站。身份、域名、接收受众、模型与发布配置按站点适配。内容可双向生成分别审核的接收版；每轮蒸馏按本机路由处理所属目标，不启动实时同步或历史整库扫描。详见 `content/sync.README.md`。

- 这是俊宁的公开数字分身，正式域名 youngjunning.com。对外姓名统一使用俊宁，不使用英文别名。
- 本项目统一承接个人官网与对外博客的维护。旧博客 blog.zisheng.pro 已归档并停止部署，旧官网 www.zisheng.pro 仅作历史来源；对外版新稿与修订维护在本仓库。非个人敏感文章先在硅基紫升内网首发，公开版按需另行审查与发布；个人敏感文章按获准受众处理。
- UI 与内站共用原版及纸上状态图两套主题；身份与地址使用站点配置。迁移时保留原组件许可、公开站的来源声明和兼容地址。原版组件沿用 Lucian 来源，纸上状态图主题保持独立页面组件；检查移动端、键盘与减少动态效果。历史 Magic UI 等组件来源仍保留在 THIRD_PARTY_NOTICES.md，不把旧来源记为新组件来源。
- 按需调用通用 memory-distill，分别判断个人记忆和收藏；两站内容双向流转前分别审查接收受众；公开可读不等于允许向公司披露。记录保留：稳定 ID、原始时间精度、独立可读正文、真实来源、去重、真实变化关联历史。个人经历与通用知识收藏分开。
- 外部项目的合格内容直接记录；内部项目只同步脱敏后的版本。公开仓库不保存内部原始资料、历史、内网地址、内部标识、绝对路径、精确会话 ID、私密内容或凭证。private 不能隐藏公开 Git 源码中的信息，本仓库拒收 private 条目。
- 来源应为可公开的本人陈述摘要或可核验公共链接，内部精确出处仅留获准公司共享的位置；个人私密出处和审核映射只留本机或个人私有目标。不得把 Agent 建议当成本人判断，不从任务进度推断个人经历。
- 文章正文维护于 content/posts，资料规范见 content/README.md；双站协议见 content/sync.README.md。阅读、API、对话共用同一份验证过的公开内容。对话依据个人记录、文章及独立审核的公开工程摘录回答，收藏和资料不冒充本人观点，不自动写回记忆或执行外部操作。
- 周刊行业动态按 `docs/weekly-aihot.md` 从 AIHOT 取得候选并逐条核对原始来源。AIHOT 只用于维护阶段的线索发现；不得把其评分、摘要或周报直接作为本站报道、本人观点或未经审核的公开快照。明确本期时间范围，优先 Agentic Computing 的真实产品与工程变化，单独写清影响和验证边界。
- 通用 Wiki、推荐问题、工程证据、文章、OKR 与 Skills 统计沿用现有协议，两站持续对齐共同产品能力、主题与交互，并各自维护受众适配。代码范围只接收明确确认主导且可公开的 GitHub 仓库；content/code-brain.json 使用 public 可见范围，不能复制公司工程摘录、代码索引、统计快照或环境配置。code:connect 和 code:review 只准备、校验待审核资料，未经审查不发布或写入个人事实。未获准的数据允许为空，不填充演示经历或目标。
- 文章允许两个方向分别审核，由 article:sync 明确指定来源、接收受众及两仓库之外的私有审核账本，先审核再生成补丁。HTML 正文与元数据成对审核，资源绑定实际字节和接收方 URL；源变更、资源变化、目标独立修改和撤回均重新核对，不自动覆盖或删除。默认输出聚合状态，--details 仅供本机私有审查，不能发布原始审核清单。
- 密钥仅配置为服务端环境变量，本仓库忽略全部实际 .env 文件。不要复制内部项目的环境或构建发布配置。
- 修改后执行 npm run content:check、npm test、npm run typecheck；应用改动执行 npm run build，再检查受影响页面。只提交任务范围，完成并验证后自动 commit 和 push；部署与线上域名单独报告。

## 数字分身模型与检索边界

模型使用本站独立的 DeepSeek 服务端环境变量。检索只读取本站已审核的公开文件快照，通过本地片段评分、显式关系与 Wiki 来源召回原文，不建立数据库索引。公司 Code Brain、原始资料、密钥和部署配置保持隔离；代码来源仍须经过本站的公开范围审核。

Wiki 和推荐问题由 Codex 在维护阶段根据本目标原文预先整理并提交；构建和推荐接口只校验、打包，不调用模型生成。仅复用经过公开审查的通用检索代码，运行时只读取本站内容快照。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

- 2026-11-08 起撤下探索清单与对话摘录，不再生成或写入 research/excerpt 栏目；旧数据仅保存在 `content/archive/retired-curation-2026-11-08/`，不进入页面、接口、首页统计或对话检索。
