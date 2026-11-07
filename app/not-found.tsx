import { getSiteTheme } from '@/lib/site-theme';
import StatechartShell from '@/components/statechart/shell';
import Link from 'next/link';
import Shell from '@/components/shell';
export default async function NotFound() { if (await getSiteTheme() === 'statechart') return <StatechartShell active="/blog" title="这张纸片暂不可用" subtitle="资料可能已迁移。回到手记目录，按标题重新查找。"><Link href="/blog">返回手记 →</Link></StatechartShell>; return <Shell><section className="empty-state"><div className="eyebrow">DOCUMENT NOT FOUND</div><h1>这篇文档暂不可用</h1><p>文档可能已迁移，回到文章列表搜索标题即可重新定位。</p><Link className="primary-button" href="/blog">返回手记</Link></section></Shell>; }
