import Link from 'next/link';
import { connection } from 'next/server';
import { getSiteTheme } from '@/lib/site-theme';
import Shell from '@/components/shell';
import StatechartShell from '@/components/statechart/shell';
import ResourceCards from '@/components/lucian/resource-cards';

export const metadata = { title: 'AIHOT 资讯线索' };

type Item = {
  id: string;
  selected: boolean;
  originalTitle: string | null;
  title: string;
  publishedAt: string | null;
  source: { name: string };
  links: { original: string; aihot: string };
};
const sourceUrl = 'https://aihot.news/agent?tab=api';
const itemUrl = 'https://aihot.news/api/v1/items?mode=selected&window=7d&by=published&limit=50';
const safeUrl = (value: string) => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
};

async function recentItems(): Promise<Item[] | null> {
  try {
    const response = await fetch(itemUrl, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    if (body.schemaVersion !== 1 || !Array.isArray(body.items)) return null;
    const seen = new Set<string>();
    return body.items.filter((item: Item) => {
      const original = safeUrl(item.links?.original);
      const aihot = safeUrl(item.links?.aihot);
      if (!item.selected || !original || !aihot || seen.has(original)) return false;
      seen.add(original);
      return true;
    }).slice(0, 6);
  } catch { return null; }
}

export default async function AIHOTPage() {
  await connection();
  const items = await recentItems();
  const description = '浏览最近 7 天的少量 AIHOT 精选线索。点开原文核对发布时间、能力与适用范围，再读本站周刊中的判断。列表每分钟至多更新一次。';
  const area = items?.map(item => ({
    id: item.id, title: item.originalTitle || item.title,
    description: `${item.source?.name || '原始来源'} · ${item.publishedAt ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', dateStyle: 'medium' }).format(new Date(item.publishedAt)) : '发布时间待核'}`,
    status: 'AIHOT 精选线索',
    details: [],
    href: item.links.original, linkLabel: '核对原文',
    links: [{ href: item.links.aihot, label: '查看 AIHOT 条目' }],
  })) || [];
  const guide = <p>使用方式：先打开原文，核对事实与可用范围；本站周刊只引用人工核实后的信息。<Link href="/blog">读本站周刊 →</Link> <Link href="/favorites?q=AIHOT">查看百宝箱中的 AIHOT →</Link> <a href={sourceUrl} target="_blank" rel="noreferrer">AIHOT 官方入口 ↗</a></p>;
  if (await getSiteTheme() === 'statechart') {
    return <StatechartShell active="/favorites" title="AIHOT 资讯线索" subtitle={description}>
      <section className="sc-section"><header><span className="sc-kicker">RECENT / SOURCE LINKS</span><h2>最近的精选线索</h2></header>
        {items === null ? <p>暂时无法获取 AIHOT 资讯。可以打开官方入口查看。</p> : area.length === 0 ? <p>当前没有可展示的线索，请稍后再看。</p> : <div className="sc-notes-row">{area.map(item => <a className="sc-note" href={item.href} target="_blank" rel="noreferrer" key={item.id}><small>{item.status} · {item.description}</small><h3>{item.title}</h3><span>核对原文 ↗</span></a>)}</div>}
      </section>{guide}
    </StatechartShell>;
  }
  return <Shell active="favorites"><section className="page-intro"><div className="eyebrow">AIHOT / SOURCE LINKS</div><h1>AIHOT<span> / 资讯线索</span></h1><p>{description}</p></section>
    <section className="favorites-content"><h2>最近的精选线索</h2>{items === null ? <p>暂时无法获取 AIHOT 资讯。可以打开官方入口查看。</p> : area.length === 0 ? <p>当前没有可展示的线索，请稍后再看。</p> : <ResourceCards ariaLabel="AIHOT 最近线索" areas={area} />}{guide}</section>
  </Shell>;
}
