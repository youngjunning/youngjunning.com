# 硅基俊宁

这是俊宁的公开数字分身，正式域名 `youngjunning.com`。对外姓名统一使用“俊宁”，不使用英文别名。

## 站点与受众

- 本仓库承接个人官网和公开博客。旧博客 `blog.zisheng.pro` 已归档，旧官网 `www.zisheng.pro` 仅作历史来源。非敏感新文章先在硅基紫升内网完成受众审查和首发，公开版按需独立审查；历史文章不迁移。
- 内外站保持共同的产品定位、内容契约、API、读取 Skill 与共享交互；身份、域名、受众、模型和部署配置独立。共享能力变更同任务核对另一站，明确例外除外。双站流转规则见 `content/sync.README.md`。
- 公开仓库不保存内部原始资料、内网地址、内部标识、绝对路径、精确会话 ID、私密内容或凭证；`private` 不能保护 Git 历史，本仓库拒收 private 条目。内部项目只接收脱敏且通过公开受众审查的版本。
- 来源必须是可公开的本人陈述摘要或可核验公共链接。Agent 建议不作为本人判断，不从任务进度推断个人经历；个人记录、文章、收藏和工程证据保持各自身份。

## 内容与数据

- 文章维护在 `content/posts/`，格式、封面、修订和验收以 `content/README.md` 为准。HTML 正文与元数据、资源实际字节与接收方 URL 成对审核；源变更、资源变化、目标独立修改或撤回后重新核对。
- 内容流转必须明确来源和接收受众，先审查再生成补丁，不自动覆盖、删除、实时同步或扫描历史整库。公开可读不等于允许向公司披露。
- 记录保留稳定 ID、原始时间精度、独立可读正文、真实来源、去重和真实变化历史；个人经历与通用知识收藏分开。未经授权的数据允许为空，不填充演示经历、观点或目标。
- 2026-11-08 起不再生成或写入 research/excerpt；旧数据仅在 `content/archive/retired-curation-2026-11-08/`，不进入页面、API、统计或检索。同日起公开站撤下关注主题与 OKR 页面/API/入口，但主题分类和百宝箱筛选继续使用；内站不受此例外影响。
- 行业资讯接入见 `docs/industry-feed.md`；周刊选稿按 `docs/weekly-aihot.md` 核对原始来源、时间范围、影响和验证边界，并与本人观点区分。
- Code Brain 仅接收明确确认主导且公开的 GitHub 仓库；连接和审查命令只准备待审核资料，未经审查不发布或写入个人事实。

## 产品与检索

- UI 与内站共享原版、纸上状态图和小香风主题，身份与地址走本站配置。保留原组件许可、公开来源声明和兼容地址；检查移动端、键盘与减少动态效果。组件来源以 `THIRD_PARTY_NOTICES.md` 为准。
- 模型使用本站独立的 DeepSeek 服务端环境变量。检索只读取已审核的公开文件快照，通过本地片段评分、显式关系与 Wiki 来源召回原文，不建立数据库索引。
- Wiki 和推荐问题由维护流程根据本站原文预先生成并提交；构建和推荐接口只校验、打包，不调用模型生成。公司 Code Brain、原始资料、密钥和部署配置与本站隔离。
- 密钥仅配置为服务端环境变量；仓库忽略实际 `.env` 文件，不复制内部项目环境或发布配置。

## 验证与交付

- 内容改动运行 `npm run content:check`、`npm test`、`npm run typecheck`；应用改动再运行 `npm run build` 并检查受影响页面。按风险补充针对性验证。
- 只提交任务范围，保留其他未提交改动。验证完成后自动 commit 和 push；部署、线上域名和真实业务结果分别报告。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
