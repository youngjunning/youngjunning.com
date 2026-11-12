import Link from 'next/link';
import { siteProfile } from '@/lib/site-profile.mjs';
import './snapshot.css';

const articleHref = `${siteProfile.articlePath}/464258397d391ba6`;

export default function SnapshotLayout({ children }: { children: React.ReactNode }) {
  return <div className="snapshot-site">
    <a className="snapshot-skip" href="#snapshot-main">跳到演示正文</a>
    <header className="snapshot-site-header">
      <Link className="snapshot-site-brand" href="/agent-browser-snapshot" aria-label="agent-browser snapshot 演示首页">
        <span className="snapshot-brand-mark" aria-hidden="true">@</span>
        <span><strong>agent-browser</strong><small>SNAPSHOT LAB</small></span>
      </Link>
      <nav className="snapshot-site-nav" aria-label="演示站导航">
        <a href="#lab">交互演示</a>
        <a href="#source">源码说明</a>
        <Link href={articleHref}>完整文章</Link>
      </nav>
      <Link className="snapshot-site-back" href="/">返回{siteProfile.siteName} <span aria-hidden="true">↗</span></Link>
    </header>
    {children}
    <footer className="snapshot-site-footer">
      <div><strong>agent-browser <span>snapshot</span></strong><p>一张订单页，看清引用定位和动作验证。</p></div>
      <div><a href="#snapshot-main">回到页首 ↑</a><Link href={articleHref}>阅读源码拆解 ↗</Link><Link href="/">返回{siteProfile.siteName} ↗</Link></div>
    </footer>
  </div>;
}
