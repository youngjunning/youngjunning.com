# 硅基俊宁

俊宁（Aaron）的公开数字分身，正式域名 **youngjunning.com**。记录个人经历、项目参与、判断与变化，独立维护精选文章和收藏。介绍：俊宁（Aaron），阿里高级工程师、AI 开发者，拥有 10 年研发经验，现专注 AI 应用、AI 浏览器、Agent、AI Infra 与软件工程。

UI 基于 [Magic UI](https://magicui.design/)，使用适配的 BlurFade 与 BentoGrid，保留来源和 MIT 许可。使用 Next.js、React、Tailwind CSS 与 Motion。

首轮从旧博客与个人知识库精选 5 篇完整文章，蒸馏 12 条有依据的个人记录，整理 9 项文章或知识资料收藏；另保留本轮公开站定位记录和 Magic UI 组件来源，共 13 条记录、10 项收藏。筛选范围与出处见 [整理清单](content/curation-2026-10-30.json)。旧项目保持原样。

## 本地运行

需要 Node.js 20.9 或以上版本。

```sh
npm ci
npm run dev
```

打开终端输出的本地地址。配置对话时，把 `.env.example` 复制为 `.env.local` 并填写服务端 `DEEPSEEK_API_KEY`，可选 `DEEPSEEK_MODEL`。未配置时，对话页明确提示服务尚未连接，资料阅读正常使用。实际环境文件全部忽略，不将密钥随源码提交或打包到公开资源。

## 内容与蒸馏

- `content/persona.json`：本人介绍与关注方向。
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

构建与运行采用标准 Next.js Node.js 部署。可接入支持 Next.js 的平台，在平台配置服务端模型环境变量，然后绑定正式域名。需要服务端运行时以提供 `/api/chat`，GitHub 仓库公开本身不代表网站已经部署或域名已绑定。

内容检查验证字段、日期、关系、去重和部分敏感标记，不能代替人工审读。所有源码及 Git 历史公开，禁止以 private 标志保存敏感内容。代码与设计来源许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
