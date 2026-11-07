import { getSiteTheme } from '@/lib/site-theme';
import { getCatalog } from '@/lib/content';
import { getRecords } from '@/lib/records';
import { getFavoriteStore } from '@/lib/favorites';
import { buildSubjectCollection } from '@/lib/subject-collection.mjs';
import { contentSubjects } from '@/lib/content-subjects.mjs';
import Shell from '@/components/shell';
import SubjectExplorer from '@/components/lucian/subject-explorer';
import StatechartShell from '@/components/statechart/shell';
import PaperCollection from '@/components/statechart/collection';

export const metadata = { title: '关注主题' };
export default async function TopicsPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const params = await searchParams;
  const subject = contentSubjects.some(item => item.id === params.subject) ? params.subject! : 'all';
  const items = buildSubjectCollection({ documents: getCatalog().documents, records: getRecords(), favorites: getFavoriteStore().favorites });
  if (await getSiteTheme() === 'statechart') return <StatechartShell active="/topics" title="关注主题" subtitle="从一个问题出发，连读文章、个人记录、工具与知识笔记。主题表示相关，不自动表达引用、因果或采用。"><PaperCollection items={items} label="跨栏目主题浏览" initialSubject={subject} /></StatechartShell>;
  return <Shell active="topics"><section className="page-intro"><div className="eyebrow">FOLLOW A QUESTION</div><h1>关注主题<span> / 沿着问题继续读</span></h1><p>同一主题下，文章展开问题，个人记录保留立场与经历，百宝箱提供资料、工具和解释。</p></section><SubjectExplorer items={items} initialSubject={subject} /></Shell>;
}
