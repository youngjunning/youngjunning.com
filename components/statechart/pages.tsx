/* eslint-disable @next/next/no-img-element -- Preserve source image URLs and intrinsic dimensions. */
import Link from 'next/link';
import { siteProfile, allowsArticleEmbed } from '@/lib/site-profile.mjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createElement } from 'react';
import type { Components } from 'react-markdown';
import { markdownRehypePlugins } from '@/lib/markdown-plugins.mjs';
import { markdownUrlTransform } from '@/lib/markdown-url.mjs';
import { getCatalog, getDocument, getGraph } from '@/lib/content';
import { getRecords, getJourneyRecords } from '@/lib/records';
import { getFavoriteStore } from '@/lib/favorites';
import { recordKinds } from '@/lib/record-kinds';
import type { PersonalRecord } from '@/lib/record-types';
import type { CatalogSkill } from '@/lib/skill-catalog-types';
import persona from '@/lib/persona';
import PaperSkillUsage from './skill-usage';
import StatechartShell from './shell';
import PaperCollection from './collection';
import PaperGraph from './graph';
import HtmlArticle from '../html-article';
import ArticleProvenance from '../article-provenance';
import ArticleRevisions from '../article-revisions';
import ArticleNotice from '../article-notice';
import PaperReaderTools from './reader-tools';
import PaperImageViewer from './image-viewer';
import { glossaryForArticle } from '@/lib/article-glossary';
import { agentBaseUrl, agentEndpoints, readerSkill, readerInstallSteps } from '@/lib/agent-access';
import { buildSiteActivity, activityHighlights } from '@/lib/site-activity.mjs';
import { attributionLabels, favoriteTypeLabels } from '@/lib/favorite-search.mjs';

const kindLabel = (kind: string) => recordKinds.find(item => item.id === kind)?.label || kind;
export function StatechartHome() {
  const catalog = getCatalog(), records = getRecords();
  const paths = [
    ['/records', 'I · THE MEMORY', '个人记录', `${records.length} 条经历与判断`],
    ['/blog', 'II · THE NOTEBOOK', '手记', `${catalog.documents.length} 篇实践与思考`],
    ['/favorites', 'III · THE COLLECTION', '百宝箱', `${getFavoriteStore().favorites.length} 份资源与笔记`],
    ['/chat', 'IV · THE CONVERSATION', `和${siteProfile.name}聊聊`, '把问题带来，把出处带走'],
  ];
  const activity = buildSiteActivity({ documents: catalog.documents, records, favorites: getFavoriteStore().favorites });
  const skillEntry = <aside className="sc-reader-entry" aria-labelledby="paper-reader-title"><div><span className="sc-kicker">FOR YOUR AGENT / 读取 SKILL</span><h2 id="paper-reader-title">让你的 Agent 认识{siteProfile.name}。</h2><p>读取经历、文章与百宝箱，回答附来源。</p></div><div className="sc-reader-actions"><a href={readerSkill.archiveUrl} download={`${siteProfile.reader.directory}.zip`}>下载{siteProfile.siteName} Skill ↓</a><Link href="/agent#install">接入说明与 API →</Link></div></aside>;
  return <StatechartShell active="/" title={'把经历写下来，\n让思考有迹可循。'} subtitle={persona.bio} lead={skillEntry}>
    <section className="sc-section sc-weekly"><header><div><span className="sc-kicker">THIS WEEK / {activity.start} — {activity.today}</span><h2>本周在生长</h2></div><Link href="/blog">继续读手记 →</Link></header><p className="sc-result">文章 {activity.counts.article} · 百宝箱 {activity.counts.favorite} · 记录 {activity.counts.record}</p>{activity.weekly && <Link className="sc-weekly-issue" href={activity.weekly.url}><span className="sc-kicker">最新一期 / {siteProfile.siteName}周刊</span><h3>{activity.weekly.title}</h3><p>{activity.weekly.summary}</p><span>打开本期 →</span></Link>}<div className="sc-notes-row">{activityHighlights(activity).map(item => <Link className="sc-note" href={item.href} key={item.id}><small>{item.label} · {item.timeLabel} {item.time.replace('T', ' ').replace('+08:00', '')}</small><h3>{item.title}</h3><p>{item.summary.slice(0, 200)}</p></Link>)}</div>{!activity.entries.length && <p>本周还没有新入库或修订的内容，可以从下面的阅读路线继续翻阅。</p>}</section>
    <section className="sc-home-map" aria-label="阅读路线"><svg className="sc-home-thread" viewBox="0 0 800 470" preserveAspectRatio="none" aria-hidden="true"><path d="M180 110 C390 80 400 110 590 120 S770 325 590 350 S260 420 170 340 S30 160 180 110" fill="none" stroke="#933323" strokeWidth="2" /><path d="m580 111 14 9-15 5 M180 331l-12 9 16 5" fill="none" stroke="#933323" strokeWidth="2" /></svg>{paths.map(([href, number, title, note], i) => <Link className={`sc-route-ticket sc-ticket-${i}`} key={href} href={href}><small>{number}</small><strong>{title}</strong><span>{note} →</span></Link>)}</section>
    <p className="sc-margin-note">这是一张阅读地图，连线表示翻阅路径。</p>
    <section className="sc-section"><header><span className="sc-kicker">RECENT NOTES</span><h2>最近留下的判断</h2><Link href="/records">翻阅档案 →</Link></header><div className="sc-notes-row">{records.filter(item => ['judgment', 'thought', 'change'].includes(item.kind)).slice(0, 3).map(item => <Link className="sc-note" href={`/records/${item.id}`} key={item.id}><small>{item.date || item.recordedAt} / {kindLabel(item.kind)}</small><h3>{item.title}</h3><p>{item.text}</p></Link>)}</div></section>
    <section className="sc-section"><header><span className="sc-kicker">THE TIMELINE</span><h2>一路走来的记录</h2></header><ol className="sc-timeline">{getJourneyRecords(records).map(item => <li key={item.id}><time>{item.period}</time><div><Link href={`/records/${item.id}`}><h3>{item.title}</h3></Link><p>{item.text}</p></div></li>)}</ol></section>
    <section className="sc-section"><header><span className="sc-kicker">SELECTED PAGES</span><h2>翻开一篇手记</h2><Link href="/blog">全部手记 →</Link></header><div className="sc-notes-row">{(persona.featuredArticleIds.length ? persona.featuredArticleIds.flatMap(id => catalog.documents.filter(doc => doc.id === id)) : catalog.documents).slice(0, 3).map(doc => <Link className="sc-note" href={doc.url} key={doc.id}><small>{doc.date || '日期未详'}</small><h3>{doc.title}</h3><p>{doc.summary}</p></Link>)}</div></section>
  </StatechartShell>;
}
export function StatechartBlog({ query = '', topic = 'all', tag = '' }: { query?: string; topic?: string; tag?: string }) {
  const catalog = getCatalog();
  return <StatechartShell active="/blog" title="手记" subtitle="从问题开始，记录实践，再回看当时的判断。"><PaperCollection key={`${query}:${topic}:${tag}`} label="文章目录" pageSize={18} fullText initialQuery={query} initialKind={topic} initialTag={tag} items={catalog.documents.map(doc => ({ id: doc.id, title: doc.title, summary: doc.summary, kind: doc.topic, label: catalog.topics.find(topic => topic.id === doc.topic)?.label || doc.topic, date: doc.updatedAt || doc.date, tags: doc.tags, href: doc.url }))} /></StatechartShell>;
}
export function RecordDetails({ record }: { record: PersonalRecord }) {
  const records = getRecords();
  const related = [...new Set([record.projectId, ...record.relatedIds, ...(record.kind === 'change' ? [record.subjectId] : [])])].filter(Boolean);
  return <><p>{record.context}</p>
    {record.kind === 'experience' && <p>时间：{record.period}{record.ongoing ? ' · 持续中' : ''}</p>}
    {record.kind === 'project' && <><h3>目标与参与</h3><p>{record.goal}</p><p>{record.role} · {record.status}</p><ul>{record.outcomes.map((outcome, i) => <li key={i}>{outcome}</li>)}</ul></>}
    {record.kind === 'judgment' && <><h3>判断依据</h3><p>{record.basis}</p>{record.alternatives.length > 0 && <p>备选：{record.alternatives.join('；')}</p>}<p>结果：{record.outcome || '尚未记录'}</p></>}
    {record.kind === 'change' && <><h3>之前 → 之后</h3><p>{record.before}</p><p>↓ {record.reason}</p><p>{record.after}</p></>}
    {record.articleId && <p><Link href={`/docs/${record.articleId}`}>关联手记 →</Link></p>}{related.map(id => <p key={id}><Link href={`/records/${id}`}>{records.find(item => item.id === id)?.title || id} →</Link></p>)}
    <h3>来源</h3><ul>{record.sources.map((source, i) => <li key={i}>{source.articleId ? <Link href={`/docs/${source.articleId}`}>{source.label}</Link> : source.label}</li>)}</ul><small>录入：{record.recordedAt} · <a href={`/api/records/${record.id}`}>结构化记录 ↗</a></small>
  </>;
}
export function StatechartRecords({ kind = 'all' }: { kind?: string }) {
  return <StatechartShell active="/records" title="个人记录" subtitle="经历、项目、判断与变化，各自留下时间和依据。"><PaperCollection key={kind} label="个人记录" pageSize={12} initialKind={kind} items={getRecords().map(record => ({ id: record.id, kind: record.kind, label: kindLabel(record.kind), title: record.title, summary: record.text, date: record.date || record.recordedAt, href: `/records/${record.id}`, searchText: record.context, detail: <RecordDetails record={record} /> }))} /></StatechartShell>;
}
export function StatechartRecord({ record }: { record: PersonalRecord }) {
  const related = getRecords().filter(item => item.id !== record.id && (item.projectId === record.id || item.relatedIds.includes(record.id) || (item.kind === 'change' && item.subjectId === record.id)));
  return <StatechartShell active="/records" title={record.title} subtitle={`${kindLabel(record.kind)} · ${record.date || '发生日期未详'}`}><div className="sc-reading-layout"><article className="sc-reading"><p className="sc-lede">{record.text}</p><RecordDetails record={record} /></article><aside className="sc-reading-index"><h2>后续与关联</h2>{related.map(item => <Link href={`/records/${item.id}`} key={item.id}>{item.title} →</Link>)}{!related.length && <p>尚无关联记录。</p>}<Link href="/records">← 返回个人记录</Link></aside></div></StatechartShell>;
}
export function StatechartFavorites() {
  const stages = { trial: '试用中', adopted: '已采用', retired: '已停用' };
  return <StatechartShell active="/favorites" title="百宝箱" subtitle="按关注的问题找资源、概念与方法；每条内容保留表达归属和来源，使用记录连接具体项目。"><PaperCollection label="百宝箱内容" items={getFavoriteStore().favorites.map(item => ({ id: item.id, kind: item.type, label: favoriteTypeLabels[item.type], title: item.title, summary: item.summary, date: item.updatedAt || item.savedAt, tags: item.tags, subjects: item.subjects, hasUsage: Boolean(item.usages?.length), searchText: `${item.reason} ${item.note?.body || ''} ${item.note?.context || ''} ${item.sources.map(source => source.label).join(' ')}`, detail: <><p>{attributionLabels[item.attribution]} · {item.selection === 'explicit' ? '主动收藏' : '会话发现'}</p>{item.note && <><p className="sc-note-body">{item.note.body}</p>{item.note.context && <p>背景：{item.note.context}</p>}{item.note.example && <><h3>示例</h3><p>{item.note.example}</p></>}{item.note.boundary && <><h3>边界</h3><p>{item.note.boundary}</p></>}</>}<p>保留理由：{item.reason}</p>{item.url && <p><a href={item.url} target="_blank" rel="noreferrer">打开原始来源 ↗</a></p>}{item.usages?.map((usage, i) => <div key={i}><h3><a href={usage.projectUrl}>{usage.project}</a> · {stages[usage.stage]}</h3><p>{usage.purpose}</p><p>依据：{usage.evidence}</p></div>)}<h3>来源</h3><ul>{item.sources.map((source, i) => <li key={i}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a> : source.label}</li>)}</ul>{item.relatedIds?.map(id => <p key={id}><Link href={`/favorites#${id}`}>关联条目 →</Link></p>)}<Link href={`/graph?doc=favorite:${item.id}`}>查看关联图谱 →</Link></> }))} /></StatechartShell>;
}
export function StatechartGraph({ doc }: { doc?: string }) {
  return <StatechartShell active="/graph" title="关联图谱" subtitle="挑一张纸片，沿着有依据的连线展开。"><PaperGraph key={doc} graph={getGraph()} initialDoc={doc} /></StatechartShell>;
}
const headings = Object.fromEntries(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map(tag => [tag, ({ id, children }: { id?: string; children?: React.ReactNode }) => createElement(tag, { id }, id && !id.startsWith('user-content-') && <span id={`user-content-${id}`} className="heading-legacy-anchor" aria-hidden="true" />, children, id && <a className="sc-anchor" href={`#${encodeURIComponent(id)}`} aria-label="章节永久链接"> #</a>)])) as Components;
export function StatechartArticle({ doc }: { doc: NonNullable<ReturnType<typeof getDocument>> }) {
  const graph = getGraph(), catalog = getCatalog();
  const ids = new Set(graph.edges.filter(edge => edge.type === 'references' && (edge.source === doc.id || edge.target === doc.id)).map(edge => edge.source === doc.id ? edge.target : edge.source));
  const glossary = glossaryForArticle(doc, catalog.documents, getFavoriteStore().favorites);
  const content = doc.content.replace(new RegExp('^# ' + doc.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\n'), '');
  return <StatechartShell active="/blog" title={doc.title} subtitle={`${doc.date || '日期未详'} · ${Math.max(1, Math.ceil(doc.words / 500))} 分钟阅读`}><PaperReaderTools content={doc.content} /><PaperImageViewer /><div className="sc-reading-layout"><article className="sc-reading" data-sc-reader><ArticleProvenance doc={doc} /><ArticleRevisions articleId={doc.id} /><div className="sc-tags">{doc.tags.map(tag => <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>{tag}</Link>)}</div>{doc.kind === 'html' ? <HtmlArticle id={doc.id} title={doc.title} /> : <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={markdownRehypePlugins} urlTransform={markdownUrlTransform(doc.urls)} components={{ ...headings, img: ({ src, alt }) => typeof src === 'string' && doc.unavailableAssets?.some(original => (doc.urls[original] || original) === src) ? <span className="source-note">原图暂不可用：<a href={src}>{alt || '原始图片链接'}</a></span> : typeof src === 'string' ? <button type="button" className="sc-image-trigger" aria-label={`预览图片：${alt || '查看大图'}`}><img src={src} alt={alt || ''} loading="lazy" /></button> : null, a: ({ href, children }) => <a href={href} {...(href?.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{children}</a>, iframe: ({ src, title }) => allowsArticleEmbed(src) ? <iframe src={src} title={title || '交互图'} sandbox="allow-scripts" loading="lazy" style={{ width: '100%', height: 680, border: 0 }} /> : null }}>{content}</ReactMarkdown>}<ArticleNotice id={doc.id} /><hr /><p>源稿：{doc.sourcePath}</p><a href={doc.rawUrl}>查看原始文档 ↗</a></article><aside className="sc-reading-index">{glossary.length > 0 && <><h2>页边知识笔记</h2>{glossary.map(entry => <details key={entry.term}><summary>{entry.term}</summary><p>{entry.summary}</p><Link href={`/favorites#${entry.favoriteId}`}>完整笔记 →</Link></details>)}</>}<h2>沿线继续读</h2>{catalog.documents.filter(item => ids.has(item.id)).map(item => <Link href={item.url} key={item.id}>{item.title} →</Link>)}{!ids.size && <p>暂无显式引用。</p>}<Link href={`/graph?doc=${doc.id}`}>查看关联图谱 →</Link><Link href="/blog">← 返回手记</Link></aside></div></StatechartShell>;
}
export function StatechartSkills({ skills, updatedAt, matt = false }: { skills: CatalogSkill[]; updatedAt: string; matt?: boolean }) {
  return <StatechartShell active="/skills" title={matt ? 'Matt Pocock 技能库' : '技能库'} subtitle={`维护和引入的工作流 · 清单更新 ${updatedAt}`}><p><Link href={matt ? '/skills' : '/skills/matt'}>{matt ? '全部 Skills' : 'Matt Pocock 专区'} →</Link></p><PaperCollection label="技能目录" items={skills.map(skill => ({ id: skill.name, kind: skill.group, label: skill.group === 'self' ? '个人维护' : '社区引入', title: skill.name, summary: skill.summary, date: updatedAt, tags: [skill.category, skill.scope].filter(Boolean), detail: <><p>来源：{skill.source}</p>{skill.sourceUrl && <a href={skill.sourceUrl} target="_blank" rel="noreferrer">查看原始来源 ↗</a>}{skill.projects && <p>项目：{skill.projects}</p>}{skill.usage && <p>约定：{skill.usage}</p>}</> }))} />{!matt && <PaperSkillUsage />}</StatechartShell>;
}
export function StatechartAgent() {
  return <StatechartShell active="/agent" title={`接入${siteProfile.siteName}`} subtitle="同一份经过校验的内容，给人阅读，也通过 Skill 与 API 给 Agent 读取。"><section id="install" className="sc-reader-install"><span className="sc-kicker">READING SKILL / 完整下载包</span><h2>{siteProfile.siteName}读取 Skill</h2><p>{siteProfile.readerAccess}读取脚本要求 Node.js 18+，无需额外模型 key。</p><div className="sc-reader-actions"><a href={readerSkill.archiveUrl} download={`${siteProfile.reader.directory}.zip`}>下载{siteProfile.siteName} Skill ↓</a><a href={siteProfile.reader.manifestUrl}>查看文件校验值 →</a></div><ol>{readerInstallSteps.map(step => <li key={step}>{step}</li>)}</ol><p>可以先问：“{siteProfile.name}最近关注哪些 Agent 话题？请引用记录和文章。”</p><details><summary>包内容与维护来源</summary><p>包含 SKILL.md、展示元数据、读取脚本与接口说明。技能名称为 {siteProfile.reader.name}，目录为 {siteProfile.reader.directory}。</p><p>SHA-256：<code>{readerSkill.sha256}</code></p><a href={siteProfile.readerSourceUrl} target="_blank" rel="noreferrer">查看唯一维护源 ↗</a></details></section><section className="sc-section"><h2>直接读取 API</h2><div className="sc-paper-grid">{agentEndpoints.map(([url, title, description]) => <a className="sc-paper" key={url} href={url}><span className="sc-kicker">READ / JSON</span><h2>{title}</h2><code>{agentBaseUrl}{url}</code><p>{description}</p></a>)}</div></section><section className="sc-section"><h2>读取与蒸馏</h2><p>读取 Skill 负责使用共享资料；memory-distill 负责从获准材料整理并保存。读取不会获得写入记忆或执行代办的权限。</p><p>本人表达、原始资料与 AI 整理分别说明归属；收藏不代表采用，关联不证明因果。所有接口、页面与下载包沿用站点现有访问控制。</p></section></StatechartShell>;
}
