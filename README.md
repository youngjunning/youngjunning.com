# 硅基俊宁

俊宁的公开数字分身，正式域名 **youngjunning.com**。记录个人经历、项目参与、判断与变化，独立维护精选文章和收藏。介绍：俊宁，阿里高级工程师、AI 开发者，拥有 10 年研发经验，现专注 AI 应用、AI 浏览器、Agent、AI Infra 与软件工程。

UI 基于 [Magic UI](https://magicui.design/)，使用适配的 BlurFade 与 BentoGrid，保留来源和 MIT 许可。使用 Next.js、React、Tailwind CSS 与 Motion。

首轮从旧博客与个人知识库精选 5 篇完整文章，蒸馏 12 条有依据的个人记录，整理 9 项文章或知识资料收藏；另保留本轮公开站定位记录和 Magic UI 组件来源，共 13 条记录、10 项收藏。首轮筛选范围与出处见 [整理清单](content/curation-2026-10-30.json)，后续迁移见下方清单。

2026-11-01 完成历史博客全量筛选：238 篇中新增 76 篇、更新原有 5 篇，157 篇未迁移。按作者要求保留原文：80 篇逐字一致，1 篇仅将 GitHub 拦截的一处历史 npm 令牌替换为占位符；保留理由、未迁移原因及图片读取结果见 [完整迁移清单](docs/博客文章迁移清单-2026-11-01.md)，站内入口为 `/blog/migration`。原始文件、导入正文和资源均有 SHA-256 校验记录。

2026-11-01，原官网知识库核对 93 份材料，迁入 11 篇学习笔记、整理 2 份参考资料，80 份不迁移；逐项理由见 [官网知识库迁移清单](docs/官网知识库迁移清单-2026-11-01.md)。个人官网与博客的维护入口已统一为 youngjunning.com。旧博客 [youngjunning/blog.zisheng.pro](https://github.com/youngjunning/blog.zisheng.pro) 已归档，原 Vercel 项目已删除；归档仓库与迁移清单继续提供历史来源，当前写作与发布均在本仓库完成。

## 本地运行

需要 Node.js 20.9 或以上版本。

```sh
npm ci
npm run dev
```

打开终端输出的本地地址。配置对话时，把 `.env.example` 复制为 `.env.local` 并填写服务端 `DEEPSEEK_API_KEY`，可选 `DEEPSEEK_BASE_URL` 和 `DEEPSEEK_MODEL`，默认使用官方接口的 `deepseek-flash`。本机也可让忽略的 `.env.local` 链接到已有的私密 DeepSeek 配置，仅复用该服务的三个配置项；部署平台独立配置服务端变量。对话使用非思考模式和 JSON 输出，来源由服务端核验后返回。未配置时，对话页明确提示服务尚未连接，资料阅读正常使用。实际环境文件全部忽略，不将密钥随源码提交或打包到公开资源。

## 内容与蒸馏

- `content/persona.json`：本人介绍与关注方向。
- `content/resume.json`：公开简历，展示于 `/resume`；保留经历与技术职责，移除私密联系方式、内部项目标识和未公开指标。原始简历在仓库外单独保留。
- `content/records.json`：version 2 个人记录，支持经历、项目、判断、变化与想法。
- `content/favorites.json`：version 1 收藏，区分本人主动收藏与会话发现，知识卡片独立保存。
- `content/posts/`：精选 Markdown 文章，稳定 ID 对应 `/blog/:id`。
- `.codex/memory-distill.md`：memory-distill 的公开目标接入约定。

协议沿用硅基紫升的字段语义、来源、时间精度、去重和变化关系。外部项目中的合格内容直接记录；内部项目只同步已脱敏公开版本，原始证据与精确出处保留内部。不会自动复制内部仓库历史、文章、环境配置或附件。低价值文档、模板、重复内容、缺乏上下文的任务流水与来源不明结论不收录。完整说明见 [内容协议](content/README.md)，访客入口为 `/protocol`。

对话只读取个人记录与可见文章，不把收藏当成本人观点；检索选择资料，模型返回引用 ID，服务端从实际资料构建链接。引用验证不等于回答每个事实都正确，资料不足时应明确未知。聊天只保留在当前页面内存，不自动写回或执行外部操作。调用模型时，访客问题、最近对话及相关公开资料会发给模型服务。服务端有限流、输入长度与超时限制；内存限流只覆盖单实例，多实例生产部署应使用平台网关限制请求。

## 验证与部署

```sh
npm run content:check
npm test
npm run typecheck
npm run build
npm start
```

构建与运行采用标准 Next.js Node.js 部署。2026-11-01 已部署到 Vercel 项目 `youngjunning.com`，连接本仓库的 GitHub 自动部署，并绑定正式域名 `youngjunning.com`；平台地址为 `youngjunning-com.vercel.app`。阿里云继续管理 DNS，根域名使用 Vercel 推荐的 A 记录。域名解析目标可能调整，后续以项目 Domains 页面为准。

生产环境单独配置 `DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL` 与 `DEEPSEEK_MODEL`，提供 `/api/chat` 所需的服务端模型配置。本地环境文件不随部署上传；`.vercel` 项目关联文件不提交。文章、封面和内容数据推送到 `main` 后，由 Vercel 构建发布；推送成功仍需核对部署结果和线上页面。回退使用 Vercel 中的上一份可用部署。

内容检查验证字段、日期、关系、去重和部分敏感标记，不能代替人工审读。所有源码及 Git 历史公开，禁止以 private 标志保存敏感内容。代码与设计来源许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

公开站使用 OpenAI SDK 调用 DeepSeek，保留本地公开资料检索，不安装 GBrain 或 PGLite。
