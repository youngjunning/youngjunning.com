import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import { getContent } from '@/lib/content';
import legacyLinks from '@/content/blog-legacy-links.json';
import { articleOutline } from '@/lib/article-outline.mjs';
import { articleReferences } from '@/lib/article-model.mjs';
export function generateStaticParams() { return getContent().posts.map(item => ({ id: item.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const post = getContent().posts.find(item => item.id === id); return { title: post?.title || '文章', description: post?.description }; }
export default async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { posts } = getContent(); const post = posts.find(item => item.id === id); if (!post) notFound();
  const outline = post.kind === 'html' ? [] : articleOutline(post.body);
  const references = articleReferences(posts, { aliases: legacyLinks, origins: ['https://youngjunning.com', 'https://blog.zisheng.pro'] });
  const relatedIds = new Set(references.flatMap(edge => edge.source === id ? [edge.target] : edge.target === id ? [edge.source] : []));
  const related = posts.filter(item => relatedIds.has(item.id)).slice(0, 6);
  const assetUrl = (url: string) => {
    let decoded = url; try { decoded = decodeURI(url); } catch { /* Keep malformed historical URLs visible as written. */ }
    return post.assets?.[url] || post.assets?.[decoded] || (url.startsWith('/images/') ? 'https://blog.zisheng.pro' + url : url);
  };
  const articleUrl = (url: string) => {
    if (/^github\.com\//.test(url)) return 'https://' + url;
    const nested = url.match(/^\[(https:\/\/[^\]]+)\]\(https:\/\/[^)]+\)$/);
    if (nested) return nested[1];
    if (url.startsWith('#')) return '#user-content-' + url.slice(1).replace(/^user-content-/, '');
    if (url.startsWith('/posts/') || /^https?:\/\/blog\.zisheng\.pro\/posts\//.test(url)) {
      const old = new URL(url, 'https://blog.zisheng.pro');
      const destination = (legacyLinks as Record<string, string>)[old.pathname.replace(/\/$/, '') + '/'];
      if (destination) return destination + (old.hash ? '#user-content-' + old.hash.slice(1).replace(/^user-content-/, '') : '');
    }
    const stable = url.match(/^\/docs\/([a-f0-9]{16})(?:#(.*))?$/);
    if (stable && posts.some(item => item.id === stable[1])) return '/blog/' + stable[1] + (stable[2] ? '#user-content-' + stable[2].replace(/^user-content-/, '') : '');
    if (!/^(?:[a-z][\w+.-]*:|\/\/)/i.test(url)) {
      let filename = url.split(/[?#]/)[0].split('/').at(-1) || '';
      try { filename = decodeURIComponent(filename); } catch { /* Fall through for malformed historical URLs. */ }
      const target = posts.find(item => item.file === filename);
      if (target) return '/blog/' + target.id + (url.includes('#') ? '#user-content-' + url.split('#').slice(1).join('#').replace(/^user-content-/, '') : '');
    }
    return url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/blog/') && !url.startsWith('/media/') ? 'https://blog.zisheng.pro' + url : url;
  };
  const coverInBody = Boolean(post.cover && post.body.includes(post.cover)) || Object.entries(post.assets || {}).some(([url, asset]) => asset === post.cover && post.body.includes(url));
  return <article className="detail prose"><Link className="back-link" href="/blog">← 返回文章</Link><h1>{post.title}</h1><span className="eyebrow">俊宁 · {post.date || '日期未详'}{post.updated && ` · 原文更新 ${post.updated}`}</span>
    {post.source && <div className="source-box">迁自历史博客，保留原文、署名、引用与原始日期；文中的版本、成果与性能结论不代表重新完成了当前验收。<br /><a href={post.source} target="_blank" rel="noreferrer">查看原始出处 ↗</a> · <Link href="/blog/migration">查看迁移清单</Link>{post.migrationNote && <><br />{post.migrationNote}</>}</div>}
    {!post.source && post.migrationNote && <div className="source-box">{post.migrationNote}{post.migrationReport && <><br /><Link href={post.migrationReport}>查看官网迁移清单</Link></>}</div>}
    {post.cover && !coverInBody && <img className="article-cover" src={post.cover} alt={post.title + '封面'} />}
    {post.publication && <p className="source-box">出版状态：{{ unknown: '待核实', draft: '草稿', ready: '待发布', published: '已发布' }[post.publication.status]}{post.publication.url && <> · <a href={post.publication.url} target="_blank" rel="noreferrer">查看出版来源 ↗</a></>}</p>}
    {outline.length > 0 && <details className="reader-outline"><summary>文章目录</summary><nav aria-label="文章目录"><ol>{outline.map(item => <li key={item.id} className={item.level === 3 ? 'nested' : undefined}><a href={'#' + item.id}>{item.label}</a></li>)}</ol></nav></details>}
    {post.kind === 'html' ? <iframe className="html-article" title={post.title} src={"/preview/" + post.id} sandbox="allow-scripts" referrerPolicy="no-referrer" /> :
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
      }}>{post.body}</ReactMarkdown>}
    {related.length > 0 && <section className="reader-related"><h2>相关引用</h2><div>{related.map(item => <Link key={item.id} href={'/blog/' + item.id}><span className="eyebrow">{item.date || '日期未详'}</span><strong>{item.title}</strong><p>{item.description}</p></Link>)}</div></section>}
    </article>;
}
