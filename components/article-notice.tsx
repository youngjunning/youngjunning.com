import Link from 'next/link';
import { articleReuseNotice } from '@/lib/article-notice';

export default function ArticleNotice({ id }: { id: string }) {
  return <section className="article-notice" aria-label="文章来源与转载说明">
    <p><strong>文章作者</strong><span>俊宁</span></p>
    <p><strong>原文链接</strong><Link href={`/blog/${id}`}>youngjunning.com/blog/{id} ↗</Link></p>
    <p><strong>转载说明</strong><span>{articleReuseNotice}</span></p>
  </section>;
}
