'use client';
import { useState } from 'react';
import type { SkillUsageStore } from '@/lib/skill-usage-types';
export function SkillUsage({ usage }: { usage: SkillUsageStore }) {
  const [projectId, setProjectId] = useState('all');
  const skills = usage.skills.map(skill => ({ ...skill, count: projectId === 'all' ? skill.triggerCount : skill.projects.find(project => project.projectId === projectId)?.triggerCount || 0 })).filter(skill => skill.count > 0).sort((a, b) => b.count - a.count);
  return <article className="resource"><h2>技能触发与项目分布</h2><p>口径为可核验的技能加载轮次，加载不等于执行成功、熟练程度或认可。</p>{usage.coverage.firstSeen === null ? <p className="empty">暂无获准公开的统计。内部项目和个人私密活动不会随模块同步。</p> : <><p>统计覆盖 {usage.coverage.firstSeen.slice(0, 10)} 至 {usage.coverage.lastSeen?.slice(0, 10)} · {usage.totals.triggerCount} 次</p><label>按项目查看 <select aria-label="统计项目" value={projectId} onChange={event => setProjectId(event.target.value)}><option value="all">全部公开项目</option>{usage.projects.map(project => <option key={project.id} value={project.id}>{project.name} · {project.triggerCount}</option>)}</select></label><div className="article-table"><table><thead><tr><th>技能</th><th>加载轮次</th></tr></thead><tbody>{skills.map(skill => <tr key={skill.name}><td>{skill.name}</td><td>{skill.count}</td></tr>)}</tbody></table></div>{skills.length === 0 && <p>该项目暂无公开统计。</p>}</>}</article>;
}
