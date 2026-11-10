import type { Metadata } from 'next';
import Link from 'next/link';
import report from '@/content/soft-skills.json';
import Shell from '@/components/shell';
import StatechartShell from '@/components/statechart/shell';
import PaperCollection from '@/components/statechart/collection';
import ResourceCards from '@/components/lucian/resource-cards';
import { getSiteTheme } from '@/lib/site-theme';
import { siteProfile } from '@/lib/site-profile.mjs';
import './soft-skills.css';

export const metadata: Metadata = {
  title: '软实力',
  description: `${siteProfile.name}基于已分享资料的软实力评测与成长建议。`,
};

const evidenceLabels: Record<string, string> = {
  strong: '依据较充分',
  moderate: '部分依据',
  limited: '依据有限',
};

const skillMap = [
  { name: '表达与倾听', description: '把想法讲清楚，也准确理解对方的问题与反馈。' },
  { name: '协作与共情', description: '理解不同角色的约束，处理分歧并共同推进事情。' },
  { name: '影响与带领', description: '让判断被理解和采纳，帮助他人一起达成目标。' },
  { name: '自我管理与适应', description: '管理承诺和压力，在变化中调整做法。' },
  { name: '学习与反思', description: '从实践和反馈中发现问题，修正下一次的行动。' },
];

function SkillMap() {
  return <section className="soft-skills-map-section" aria-labelledby="soft-skills-map-title">
    <span className="eyebrow">THE MAP / 先认识范围</span><h2 id="soft-skills-map-title">软实力有哪些</h2>
    <p>这是一张帮助理解范围的参考地图，不是对个人能力的判断。具体维度由下方评测从资料中提取。</p>
    <dl className="soft-skills-map">{skillMap.map(item => <div key={item.name}><dt>{item.name}</dt><dd>{item.description}</dd></div>)}</dl>
    <p className="soft-skills-map-sources">参考：<a href="https://www.oecd.org/en/publications/social-and-emotional-skills-for-better-lives_35ca7b7c-en.html" target="_blank" rel="noopener noreferrer">OECD 社会与情绪技能框架 ↗</a><a href="https://www.weforum.org/publications/the-future-of-jobs-report-2025/3-skills-outlook" target="_blank" rel="noopener noreferrer">WEF 2025 核心技能 ↗</a></p>
  </section>;
}

export default async function SoftSkillsPage() {
  const areas = report.areas.map(area => ({
    id: area.id,
    title: area.name,
    description: area.assessment,
    status: evidenceLabels[area.evidenceStrength] || '依据待核对',
    details: [
      ...area.evidence.map(item => `依据：「${item.quote}」`),
      ...area.recommendations.map((item, index) => `成长建议 ${index + 1}：${item}`),
      `下次需要的证据：${area.nextEvidence}`,
    ],
    href: null,
    linkLabel: '',
    links: area.evidence.map(item => ({ href: item.url, label: `查看依据：${item.title}` })),
  }));

  if (await getSiteTheme() === 'statechart') return <StatechartShell
    active="/soft-skills"
    title="软实力"
    subtitle="从已有资料中提取可观察的能力线索，由大模型评测并给出下一步建议。"
  >
    <section className="soft-skills-paper-intro"><span className="sc-kicker">AI ASSESSMENT / {report.assessedAt}</span><p>{report.summary}</p></section>
    <SkillMap />
    <PaperCollection label="软实力评测" items={report.areas.map(area => ({
      id: area.id,
      title: area.name,
      summary: area.assessment,
      kind: area.evidenceStrength,
      label: evidenceLabels[area.evidenceStrength] || '依据待核对',
      date: report.assessedAt,
      detail: <div className="soft-skills-paper-detail">
        <h3>依据</h3><ul>{area.evidence.map(item => <li key={item.sourceId}><Link href={item.url}>{item.title}</Link><p>“{item.quote}”</p><p>{item.reason}</p></li>)}</ul>
        <h3>成长建议</h3><ol>{area.recommendations.map(item => <li key={item}>{item}</li>)}</ol>
        <p><strong>下次核对：</strong>{area.nextEvidence}</p>
      </div>,
    }))} />
    <section className="soft-skills-paper-note"><h2>评测边界</h2><p>{report.limitations}</p><p>这是 {report.assessedAt} 的资料快照；新材料进入站点后，需要重新评测。</p></section>
  </StatechartShell>;

  return <Shell active="soft-skills">
    <section className="page-intro soft-skills-intro"><div className="eyebrow">GROWTH / AI ASSESSMENT</div><h1>软实力<span> / 从证据走向成长</span></h1><p>{report.summary}</p><small>评测日期 {report.assessedAt} · {report.model} · {report.sourceCount} 份候选资料</small></section>
    <SkillMap />
    <section className="soft-skills-main" aria-label="软实力评测与成长建议">
      <header><span className="eyebrow">OBSERVE → PRACTICE → VERIFY</span><h2>观察到的能力线索</h2><p>每项评测都附原始依据、可尝试的练习和下一次需要收集的证据。</p></header>
      <ResourceCards ariaLabel="软实力评测结果" areas={areas} />
    </section>
    <aside className="soft-skills-boundary"><span className="eyebrow">ASSESSMENT BOUNDARY</span><h2>评测边界</h2><p>{report.limitations}</p><p>这是 {report.assessedAt} 的资料快照；新材料进入站点后，需要重新评测。</p></aside>
  </Shell>;
}
