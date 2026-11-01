import { getContent } from '@/lib/content';
import { PostList } from '@/components/collection';
import Link from 'next/link';
export const metadata = { title: '文章' };
export default function Blog() { return <><header className="page-head"><span className="eyebrow">NOTES & ESSAYS</span><h1>把思考，写清楚。</h1><p>关于 AI 应用、Agent、AI Infra 与软件工程的实践和判断。公开文章独立维护，保留原始时间与稳定引用。</p><Link className="migration-link" href="/blog/migration">查看迁移清单与未迁移原因 →</Link></header><section className="page-body"><PostList posts={getContent().posts} /></section></>; }
