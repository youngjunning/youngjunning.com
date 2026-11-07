/* eslint-disable @next/next/no-img-element -- Preserve reviewed source covers. */
import Link from 'next/link';
import type { Document } from '@/lib/types';

export default function ArticleProvenance({ doc }: { doc: Document & { content: string; urls: Record<string, string> } }) {
  const coverInBody = Boolean(doc.cover && (doc.content.includes(doc.cover) || Object.entries(doc.urls).some(([from, to]) => to === doc.cover && doc.content.includes(from))));
  return <>
    {doc.updated && <p className="source-note">原文更新 {doc.updated}</p>}
    {doc.source && <div className="source-note">迁自历史博客，保留原文、署名、引用与原始日期；文中的版本、成果与性能结论不代表重新完成了当前验收。<br /><a href={doc.source} target="_blank" rel="noreferrer">查看原始出处 ↗</a> · <Link href="/blog/migration">查看迁移清单</Link>{doc.migrationNote && <><br />{doc.migrationNote}</>}</div>}
    {!doc.source && doc.migrationNote && <div className="source-note">{doc.migrationNote}{doc.migrationReport && <><br /><Link href={doc.migrationReport}>查看迁移清单</Link></>}</div>}
    {doc.cover && !coverInBody && <img className="article-cover" src={doc.cover} alt={doc.title + '封面'} />}
    {doc.publication && <p className="source-note">出版状态：{{ unknown: '待核实', draft: '草稿', ready: '待发布', published: '已发布' }[doc.publication.status]}{doc.publication.url && <> · <a href={doc.publication.url} target="_blank" rel="noreferrer">查看出版来源 ↗</a></>}</p>}
  </>;
}
