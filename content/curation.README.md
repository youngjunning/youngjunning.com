# 探索清单与对话精选

两类内容独立于个人记录和收藏夹。所有源文件及 Git 历史均公开；写入前逐段审核受众。站点页面和 API 只读，内容由 `memory-distill` 通过本仓库 JSON 文件维护。

## 探索清单

`research.json` 顶层为 `{ "version": 1, "items": [] }`；页面 `/research`，接口 `/api/research`。条目字段：`id`、`title`、`question`、`context`、`reason`、`nextStep`、`nextStepSource`、`status`、`blocker`、`result`、`relatedFavoriteIds`、`createdAt`、`updatedAt`、`visibility`、`sources`。

`id` 为 16 位小写十六进制稳定 ID，按问题与研究范围去重。本人提出值得继续追的目标或问题、且本轮结束时仍有关键未解部分时可以收录；先核对是否已经解决或撤回，不依赖“以后研究”等固定措辞。`nextStepSource` 为 `user` 或 `suggested`，AI 整理的下一步标为后者。状态为 `todo`、`in_progress`、`paused`、`completed`、`dropped`；暂缓需要 `blocker`，完成需要实际 `result`。`relatedFavoriteIds` 仅关联本站收藏；未知时为空数组。日期为 YYYY-MM-DD。`sources` 至少一项，包含可公开的 `label` 和可选公共 `url`。`visibility` 只能是 `shared`。不得从收藏或计划推断完成。

## 对话精选

`excerpts.json` 顶层为 `{ "version": 1, "items": [] }`；页面 `/excerpts`，接口 `/api/excerpts`。条目字段：`id`、`title`、`context`、`reason`、`selection`、`format`、`messages`、`source`、`date`、`savedAt`、`visibility`。

当前只接受本人明确挑选的 `selection: explicit`。`format` 为 `verbatim` 或 `summary`，摘要不能冒充原话。`messages` 保留 1–8 条必要的 `user`/`assistant` 消息，每条最多 1200 字符，并包含条件及后续纠正。`source` 需有可公开、可回看的 HTTP(S) URL；私人 Codex 会话的精确 ID、路径和原文不得进入本仓库。没有可公开来源的片段只保留候选。`date` 未知可为 null；`savedAt` 为实际日期；`visibility` 只能是 `shared`。

## 写入与验收

逐条核对公开来源、正文、关系、文件名和 URL；不复制完整会话、系统提示、凭证或附件。运行 `npm run content:check`、相关测试，回读数据与页面。内站内容仅在保真脱敏且获准时单向同步；公开内容不反向写入公司站。提交、推送、部署和线上验收分别报告。
