import Link from 'next/link';
import { articleLicenseName, articleLicenseUrl } from '@/lib/article-notice';

export default function ArticleNotice({ id }: { id: string }) {
  return <section className="article-notice" aria-label="文章来源与版权声明">
    <p><strong>文章作者</strong><span>俊宁</span></p>
    <p><strong>文章链接</strong><Link href={`/blog/${id}`}>https://youngjunning.com/blog/{id}</Link></p>
    <p><strong>版权声明</strong><span>除特别声明外，本站手记均采用 <a href={articleLicenseUrl} target="_blank" rel="noreferrer">{articleLicenseName}</a> 授权协议。转载请注明出处：<Link href="/">硅基俊宁</Link>。</span></p>
  </section>;
}
