# 硅基俊宁公开目标

根目录为本文件上一层目录（..）。主体为俊宁，站名硅基俊宁，正式域名 youngjunning.com。先读取 AGENTS.md、content/README.md 与 lib/model.mjs。

个人记录写入 content/records.json，version: 2；字段和专有类型与硅基紫升一致。正文/标题/背景映射 text/title/context，类型 experience/project/judgment/change/thought。id 为 16 位小写十六进制稳定 ID，跨目标同步保留原 ID。date 是发生日期，未知为 null，recordedAt 是录入日期。sources.kind 为 statement/archive/article，label 仅保存可公开来源。未知理由写明，未知备选为空数组、结果为 null。修复保留 ID，真实变化新增关联 change。

收藏独立写 content/favorites.json，version: 1。kind 为 project/knowledge/card，explicit 仅表示本人明确收藏，Agent 发现使用 discovered。按原始 URL 去重；card 的 url 为 null，并映射 date、recordedAt、context、understanding、example、distinction。收藏不作为本人参与、认可或掌握的证据。

external 项目只写本目标；internal 项目仅接收已脱敏公开版本，原始证据、摘录、会话位置和跨目标映射保留内部。unknown 只输出候选。原始来源不适合公开时用“本人陈述，日期，公开摘要”，不要把不可访问内网链接改写成虚构公共链接。不在本仓库创建原始证据 archive。仅使用 shared，拒绝 private；所有源文件均公开。

写入前读取现有数据，按事件、对象、立场、出处和 URL 去重，保留并行修改。完成后执行 npm run content:check 和 npm test，回读对应数据；有运行服务时检查 /records/:id、/api/records/:id 或 /favorites 与 /api/favorites，没有服务则如实报告页面未验收。应用修改再执行 typecheck 与 build。验证后自动提交并推送本任务内容，单独报告部署状态。
