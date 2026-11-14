import { getSiteTheme } from '@/lib/site-theme';
import { StatechartArticle } from '@/components/statechart/pages';
import Link from 'next/link';
import { displayContentTime } from '@/lib/content-time.mjs';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Shell from '@/components/shell';
import Markdown from '@/components/markdown';
import HtmlArticle from '@/components/html-article';
import CopyMarkdown from '@/components/copy-markdown';
import ArticleNotice from '@/components/article-notice';
import ArticleProvenance from '@/components/article-provenance';
import ArticleRevisions from '@/components/article-revisions';
import { siteProfile } from '@/lib/site-profile.mjs';
import ReadingProgress from '@/components/lucian/reading-progress';
import BackToTop from '@/components/lucian/back-to-top';
import ArticleTags from '@/components/lucian/article-tags';
import ArticleReadingStats from '@/components/lucian/article-reading-stats';
import ArticleToc from '@/components/lucian/article-toc';
import RecordAreas from '@/components/lucian/record-areas';
import SignalLink from '@/components/lucian/signal-link';
import { getCatalog, getDocument, getGraph } from '@/lib/content';
import { getFavoriteStore } from '@/lib/favorites';
import { glossaryForArticle } from '@/lib/article-glossary';
import { readingMinutes } from '@/lib/article-reading.mjs';
import '@/components/lucian/article-typography.css';

export function generateStaticParams() { return getCatalog().documents.map(({ id }) => ({ id })); }
export const dynamicParams = true;
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const doc = getDocument((await params).id);
  return { title: doc?.title || '文档未找到', ...(doc ? { description: doc.summary, alternates: { canonical: `${siteProfile.articlePath}/${doc.id}` } } : {}) };
}
export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const theme = await getSiteTheme();
  const doc = getDocument((await params).id);
  if (!doc) notFound();
  if (theme === 'statechart') return <StatechartArticle doc={doc} />;
  const catalog = getCatalog();
  const topic = catalog.topics.find((item) => item.id === doc.topic)!;
  const refs = getGraph().edges.filter((edge) => edge.type === 'references' && (edge.source === doc.id || edge.target === doc.id));
  const related = [...new Set(refs.map((edge) => edge.source === doc.id ? edge.target : edge.source))].map((id) => catalog.documents.find((item) => item.id === id)!).filter(Boolean);
  const glossary = doc.kind === 'markdown' ? glossaryForArticle(doc, catalog.documents, getFavoriteStore().favorites) : [];
  return <Shell><ReadingProgress /><BackToTop key={doc.id} /><div className="reader-top"><Link href="/blog" className="back-link">← 返回手记</Link><div>{doc.kind === 'markdown' && <CopyMarkdown text={doc.content} articleId={doc.id} />}<a href={doc.rawUrl}>查看原文 ↗</a><Link href={`/graph?doc=${doc.id}`}>在图谱中查看 ↗</Link></div></div>
    <div className="reader-layout article-layout"><article className="reader"><div className="reader-meta"><span style={{ color: topic.color }}>{topic.label}</span>{doc.date && <time dateTime={doc.date}>创建 {displayContentTime(doc.date)}</time>}{doc.updatedAt && <time dateTime={doc.updatedAt}>更新 {displayContentTime(doc.updatedAt)}</time>}<ArticleReadingStats words={doc.words} /></div><h1 id="article-title" tabIndex={-1}>{doc.title}<a className="heading-anchor" href="#article-title" aria-label="文章标题的永久链接">#</a></h1>
      <ArticleTags tags={doc.tags} />
      <ArticleProvenance doc={doc} />
      <ArticleRevisions articleId={doc.id} />
      {doc.kind === 'html' ? <HtmlArticle id={doc.id} title={doc.title} /> : <div className="prose"><Markdown content={doc.content} urls={doc.urls} title={doc.title} glossary={glossary} unavailableAssets={doc.unavailableAssets} /></div>}
      <div className="source-note">源稿位置 <code>{catalog.source.root}/{doc.sourcePath}</code></div>
      <ArticleNotice id={doc.id} />
    </article><div className="article-sidebar"><ArticleToc documentId={doc.id} /></div></div>
    <section className="ux u228 article-connections" aria-labelledby="article-connections-title">
      <header className="article-connections-head"><div><div className="eyebrow">DOCUMENT CONNECTIONS</div><h2 id="article-connections-title">关联文档</h2><p className="muted">{related.length ? '沿着本文的引用，继续阅读。包含引出与反向引用。' : '这篇文档暂未建立显式引用。可在引用图谱中浏览同主题内容。'}</p></div><SignalLink href={`/graph?doc=${doc.id}`} label="探索引用关系" /></header>
      {related.length > 0 && <RecordAreas ariaLabel="关联文档" areas={related.map((item) => ({ title: item.title, description: item.summary, status: `${catalog.topics.find((entry) => entry.id === item.topic)?.label ?? item.classification} · ${readingMinutes(item.words)} 分钟`, href: item.url }))} />}
    </section>
  </Shell>;
}
