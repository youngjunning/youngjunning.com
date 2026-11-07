# 探索清单与对话摘录

两类内容独立于个人记录和收藏夹，由 `memory-distill` 按本轮证据、受众和去重规则写入。站点读取经验证的共享快照；网页与 API 只读。公开仓库只接收 shared，拒绝以 private 保存非公开资料。

## 探索清单

源文件 `research.json`，顶层 `{ "version": 1, "items": [] }`，页面 `/research`，接口 `/api/research`。每项必须包含：

- `id`：16 位小写十六进制稳定身份；按问题与研究范围去重，补资料或改状态保留 ID。
- `title`、`question`、`context`、`reason`、`nextStep`：分别用于短标题、待解问题、背景、保留理由和可执行下一步；`nextStepSource` 为 `user` 或 `suggested`，后者在页面明确标注 AI 建议。
- `status`：`todo`、`in_progress`、`paused`、`completed`、`dropped`。暂缓必须填写 `blocker`；完成必须填写实际 `result`。其余字段可为 null。收藏、打开网页或仅写计划不算完成。
- `relatedFavoriteIds`：关联本站已有收藏 ID，未知时为空数组；`createdAt`、`updatedAt` 为实际日期；本公开目标的 `visibility` 仅接受 `shared`；`sources` 为至少一个 `{ "label": "可回查来源", "url": null }`，URL 可省略。不得伪造截止时间。

## 对话摘录

源文件 `excerpts.json`，顶层 `{ "version": 1, "items": [] }`，页面 `/excerpts`，接口 `/api/excerpts`。每项包含 `id`、`title`、`context`、`reason`、`selection`、`format`、`messages`、`source`、`date`、`savedAt`、`visibility`。

`selection` 为 `explicit` 或 `discovered`；只有本人明确挑选具体片段才用 `explicit`。公开目标仅接收本人明确挑选且内容与来源均可公开的片段，保留选择理由；私人会话没有公共来源时仅列候选。共同模型支持 discovered 不代表获得自动公开授权。`format` 为 `verbatim` 或 `summary`；摘要不得伪装成逐字原话。`messages` 保留 1–8 条必要的 `user`/`assistant` 消息，逐条文本最多 1200 字符，包含使含义成立的条件和后续纠正。`source` 为 `{ "label": "可回查位置", "url": null }`，日期未知为 null。AI 说的话不归为本人观点，未经核验的事实应在上下文或保留理由标明。

## 写入与验收

只保存本轮合格增量或本人明确要求回溯的范围；不复制完整会话、系统提示、凭证或附件。探索清单要核对问题在本轮结束时仍未解决，区分本人后续意图与 AI 建议的下一步；对话摘录要核对完整的问答或判断转折，并区分本人选择和会话发现。先核对公开受众和公共来源，再写源文件；公司接收版另按双向同步协议重新审查。运行 `npm run content:check` 与相关测试，回读源文件、共享快照、页面和 API；只在实际写入并验证后计入本轮蒸馏。站点源码变动按项目规则另做类型检查和构建。
