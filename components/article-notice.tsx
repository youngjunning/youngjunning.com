import Link from 'next/link';
import { articleNoticePolicy } from '@/lib/article-notice';
import { siteProfile } from '@/lib/site-profile.mjs';

export default function ArticleNotice({ id }: { id: string }) {
  const href = `${siteProfile.articlePath}/${id}`;
  return <section className="article-notice" aria-label="文章来源与转载说明">
    <p><strong>文章作者</strong><Link href="/chat">{siteProfile.name}</Link></p>
    <p><strong>原文链接</strong><Link href={href}>{siteProfile.baseUrl}{href}</Link></p>
    <p><strong>{articleNoticePolicy.label}</strong><span>{articleNoticePolicy.text}{articleNoticePolicy.licenseUrl && <> <a href={articleNoticePolicy.licenseUrl} target="_blank" rel="noreferrer">{articleNoticePolicy.licenseName}</a></>}</span></p>
  </section>;
}
