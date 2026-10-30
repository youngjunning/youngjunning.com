import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getContent } from '@/lib/content';
export function generateStaticParams() { return getContent().posts.map(item => ({ id: item.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const post = getContent().posts.find(item => item.id === id); return { title: post?.title || '文章', description: post?.description }; }
export default async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const post = getContent().posts.find(item => item.id === id); if (!post) notFound();
  return <article className="detail prose"><Link className="back-link" href="/blog">← 返回文章</Link><h1>{post.title}</h1><span className="eyebrow">俊宁 · {post.date || '日期未详'}</span>
    {post.source && <div className="source-box">精选自历史文章，保留原始日期与当时语境；文中的版本、成果与性能结论不代表重新完成了当前验收。<br /><a href={post.source} target="_blank" rel="noreferrer">查看原始出处 ↗</a></div>}
    {post.cover && <img className="article-cover" src={post.cover} alt={post.title + '封面'} />}
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown></article>;
}
