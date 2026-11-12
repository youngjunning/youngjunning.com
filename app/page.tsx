import { getSiteTheme } from '@/lib/site-theme';
import { StatechartHome } from '@/components/statechart/pages';
import { getCatalog, getSiteCloud } from '@/lib/content';
import Link from 'next/link';
import Shell from '@/components/shell';
import { getGraph } from '@/lib/content';
import persona from '@/lib/persona';
import EditorialCard from '@/components/lucian/editorial-card';
import LifeTimeline from '@/components/lucian/life-timeline';
import ProjectWorkList from '@/components/lucian/project-work-list';
import RecordStories from '@/components/lucian/record-stories';
import MotionSection from '@/components/lucian/motion-section';
import PerspectiveCards from '@/components/lucian/perspective-cards';
import KnowledgePortal from '@/components/lucian/knowledge-portal';
import IdentityHero from '@/components/lucian/identity-hero';
import { getJourneyRecords, getRecords } from '@/lib/records';
import type { ProjectRecord } from '@/lib/record-types';
import WordCloud from '@/components/lucian/word-cloud';
import './home-final.css';
import { readingMinutes } from '@/lib/article-reading.mjs';
import { getFavoriteStore } from '@/lib/favorites';
import { buildSiteActivity } from '@/lib/site-activity.mjs';
import SiteActivity from '@/components/lucian/site-activity';

export default async function Home() {
  if (await getSiteTheme() === 'statechart') return <StatechartHome />;
  const catalog = getCatalog();
  const records = getRecords();
  const cloud = getSiteCloud();
  const experiences = getJourneyRecords(records);
  const projects = persona.featuredProjectIds.flatMap((id) => records.filter((record): record is ProjectRecord => record.kind === 'project' && record.id === id));
  const documents = new Map(catalog.documents.map((doc) => [doc.id, doc]));
  const featured = persona.featuredArticleIds.length ? persona.featuredArticleIds.flatMap(id => documents.has(id) ? [documents.get(id)!] : []) : catalog.documents.slice(0, 3);
  const referenceCount = getGraph().edges.filter((edge) => edge.type === 'references').length;
  const activity = buildSiteActivity({ documents: catalog.documents, records, favorites: getFavoriteStore().favorites });
  return <Shell active="home">
    <IdentityHero articleCount={catalog.documents.length} recordCount={records.length} projectCount={projects.length} />

    <MotionSection id="this-week" eyebrow="THIS WEEK" title="本周在生长" description="这一周新写、修订或收进来的内容。"><SiteActivity activity={activity} /></MotionSection>

    <MotionSection id="word-cloud" className="site-wordcloud-section" eyebrow="THE SHAPE OF A MIND" title="全站词云 · 关注的事" description="从个人记录与手记正文中，看看哪些词持续出现。"><WordCloud title="全站词云" description="从共享个人记录与手记正文提取高频词，按正文出现次数展示；点击词语查看对应记录和文章。" words={cloud} scopes={['全站', '个人记录', '手记']} groups={[{id:'both',label:'共同主题',color:'var(--style-secondary)'},{id:'record',label:'个人记录',color:'var(--style-accent)'},{id:'blog',label:'手记',color:'var(--style-muted)'}]} unit="次出现" /></MotionSection>

    <MotionSection className="persona-records" eyebrow="IN THE MOMENT" title="最近的判断与想法" action={<Link className="text-link" href="/records">全部个人记录 ↗</Link>}><RecordStories records={records.filter((record) => record.kind === 'judgment' || record.kind === 'thought')} /></MotionSection>

    <MotionSection id="journey" className="journey-section" eyebrow="LIFE, IN CONTEXT" title="人生履历" description="从网络工程，到 AI 应用开发。"><LifeTimeline events={experiences.map((record) => ({ id: record.id, period: record.period, title: record.title, detail: record.text, ongoing: record.ongoing }))} /></MotionSection>

    <MotionSection id="projects" eyebrow="WORK THROUGH PRACTICE" title="经历中的代表项目" description="从业务问题出发，在真实交付中形成判断。"><ProjectWorkList projects={projects.map((record) => ({ name: record.title, label: record.label, description: record.text, role: record.role, tags: record.tags, href: `/records/${record.id}` }))} /></MotionSection>

    <MotionSection id="thinking" className="persona-perspectives" eyebrow="HOW I THINK" title="价值观与判断原则" description="从本人记录与文章中，看到我重视什么、如何做取舍。"><div id="decisions"><PerspectiveCards views={[...persona.valueRecordIds.flatMap((id) => records.filter((record) => record.id === id).map((record) => ({ title: record.title, description: record.kind === 'change' ? record.after : record.text, href: `/records/${record.id}` }))), ...persona.perspectives.flatMap((view) => documents.has(view.articleId) ? [{ ...view, href: documents.get(view.articleId)!.url }] : [])]} /></div><p className="perspective-basis">价值观来自本人明确表达的记录；其余观点根据站内文章归纳，点击可查看依据与适用条件。</p></MotionSection>

    <MotionSection className="persona-reading" eyebrow="THE WRITTEN RECORD" title="手记 · 实践与思考" action={<Link className="text-link" href="/blog">进入手记 ↗</Link>}><div className="persona-featured lucian-featured">{featured.map((doc, index) => { const id = doc.id; return <div className="motion-reveal reading-reveal" key={id}><EditorialCard href={doc.url} title={doc.title} summary={doc.summary} category={catalog.topics.find((topic) => topic.id === doc.topic)?.label || '文章'} minutes={readingMinutes(doc.words)} tone={index} /></div>; })}</div></MotionSection>

    <KnowledgePortal articles={catalog.documents.length} topics={catalog.topics.length} references={referenceCount} />
  </Shell>;
}
