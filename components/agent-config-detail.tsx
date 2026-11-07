import { RUBRIC, evaluationIsCurrent } from '@/lib/agent-config-policy.mjs';
import type { AgentConfig } from '@/lib/agent-config-types';

export function ConfigDetail({ entry, configs }: { entry: AgentConfig; configs: AgentConfig[] }) {
  const latest = entry.revisions[0];
  const parent = configs.find(c => c.id === entry.parentId);
  return <div className="agent-config-detail">
    <p>{entry.sourceLabel} · 保存于 {latest.savedAt.slice(0, 10)} · {latest.content.length.toLocaleString('zh-CN')} 字符</p>
    <p>{parent ? <>关联全局配置：<a href={`#${parent.id}`}>{parent.title}</a>。评测同时检查两份配置的冲突。</> : entry.scope === 'global' ? '全局规则：为跨项目任务提供默认约定。' : '独立项目配置：尚未关联全局配置。'}</p>
    <a className="agent-config-download" href={`/api/agent-configs/${entry.id}?format=markdown`}>下载当前 AGENTS.md ↗</a>
    <h3>模型评测</h3>
    <p>固定五维，各 20 分。分数是文档静态质量判断，不代表实际任务成功率；原文中的命令不会被执行。</p>
    {!entry.evaluations.length && <p className="agent-config-notice">尚未评测。入库后由维护端调用本站模型，评测通过校验后随配置保存。</p>}
    {entry.evaluations.map((evaluation, i) => <section className="agent-config-evaluation" key={`${evaluation.evaluatedAt}-${i}`} aria-label={`第 ${entry.evaluations.length - i} 次评测`}>
      <div className="agent-config-score"><strong>{evaluation.total}<small> / 100</small></strong><span>{i === 0 ? '最近评测' : '历史评测'} · {evaluationIsCurrent(entry, evaluation, configs) ? '对应当前配置' : '历史版本，需重新评测'}</span></div>
      <p>{evaluation.summary}</p>
      <p className="agent-config-meta">{evaluation.model} · {evaluation.evaluatedAt.replace('T', ' ').slice(0, 19)} UTC · 量表 {evaluation.rubricVersion}<br />配置 {evaluation.hash.slice(0, 12)}{evaluation.parentHash && ` · 全局 ${evaluation.parentHash.slice(0, 12)}`}</p>
      <ol className="agent-config-dimensions">{evaluation.dimensions.map(d => <li key={d.id}>
        <h4>{RUBRIC.find(r => r.id === d.id)?.label} <span>{d.score} / 20</span></h4>
        <p>{d.reason}</p>
        {d.evidence.map((e, j) => <blockquote key={j}><small>{e.source === 'global' ? '全局配置依据' : '配置原文依据'}</small><p>{e.quote}</p></blockquote>)}
        <p><b>建议：</b>{d.suggestion}</p>
      </li>)}</ol>
    </section>)}
    <h3>配置原文</h3><p className="agent-config-meta">SHA-256：{latest.hash}</p>
    <pre className="agent-config-source" tabIndex={0} aria-label={`${entry.title}原文`}>{latest.content}</pre>
    <h3>版本记录</h3><ul>{entry.revisions.map((revision, i) => <li key={revision.hash}><a href={`/api/agent-configs/${entry.id}?format=markdown&version=${revision.hash}`}>{i === 0 ? '当前版本' : '历史版本'} · {revision.savedAt.slice(0, 10)} · {revision.hash.slice(0, 12)} ↗</a></li>)}</ul>
  </div>;
}
