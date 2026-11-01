import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import { getContent } from '@/lib/content';
import legacyLinks from '@/content/blog-legacy-links.json';
export function generateStaticParams() { return getContent().posts.map(item => ({ id: item.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const post = getContent().posts.find(item => item.id === id); return { title: post?.title || '文章', description: post?.description }; }
export default async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const post = getContent().posts.find(item => item.id === id); if (!post) notFound();
  const assetUrl = (url: string) => {
    let decoded = url; try { decoded = decodeURI(url); } catch { /* Keep malformed historical URLs visible as written. */ }
    return post.assets?.[url] || post.assets?.[decoded] || (url.startsWith('/images/') ? 'https://blog.zisheng.pro' + url : url);
  };
  const articleUrl = (url: string) => {
    if (url.startsWith('#')) return '#user-content-' + url.slice(1).replace(/^user-content-/, '');
    if (url.startsWith('/posts/') || /^https?:\/\/blog\.zisheng\.pro\/posts\//.test(url)) {
      const old = new URL(url, 'https://blog.zisheng.pro');
      const destination = (legacyLinks as Record<string, string>)[old.pathname.replace(/\/$/, '') + '/'];
      if (destination) return destination + (old.hash ? '#user-content-' + old.hash.slice(1).replace(/^user-content-/, '') : '');
    }
    return url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/blog/') && !url.startsWith('/media/') ? 'https://blog.zisheng.pro' + url : url;
  };
  const coverInBody = Object.entries(post.assets || {}).some(([url, asset]) => asset === post.cover && post.body.includes(url));
  return <article className="detail prose"><Link className="back-link" href="/blog">← 返回文章</Link><h1>{post.title}</h1><span className="eyebrow">俊宁 · {post.date || '日期未详'}{post.updated && ` · 原文更新 ${post.updated}`}</span>
    {post.source && <div className="source-box">迁自历史博客，保留原文、署名、引用与原始日期；文中的版本、成果与性能结论不代表重新完成了当前验收。<br /><a href={post.source} target="_blank" rel="noreferrer">查看原始出处 ↗</a> · <Link href="/blog/migration">查看迁移清单</Link>{post.migrationNote && <><br />{post.migrationNote}</>}</div>}
    {!post.source && post.migrationNote && <div className="source-box">{post.migrationNote}{post.migrationReport && <><br /><Link href={post.migrationReport}>查看官网迁移清单</Link></>}</div>}
    {post.cover && !coverInBody && <img className="article-cover" src={post.cover} alt={post.title + '封面'} />}
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSlug, rehypeSanitize]}
      urlTransform={(url, key) => defaultUrlTransform(key === 'src' ? assetUrl(url) : articleUrl(url))}
      components={{
        img({ src, alt, title, width, height }) {
          const url = typeof src === 'string' ? src : '';
          if (post.unavailableAssets?.some(original => assetUrl(original) === url)) return <span className="missing-image">原图暂不可用：<a href={url} target="_blank" rel="noreferrer">{alt || '查看原始图片链接'}</a></span>;
          if (!url) return null;
          return <img src={url} alt={alt || '原文配图'} title={title} width={width} height={height} loading="lazy" />;
        },
        a({ href, children, id }) { return <a id={id} href={href} {...(href?.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{children}</a>; },
        table({ children }) { return <div className="article-table" role="region" aria-label="文章表格" tabIndex={0}><table>{children}</table></div>; },
      }}>{post.body}</ReactMarkdown></article>;
}
