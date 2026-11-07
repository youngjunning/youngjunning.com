import { siteProfile } from '@/lib/site-profile.mjs';
import Link from 'next/link';
import type { ReactNode } from 'react';
import SiteThemeSwitch from '../site-theme-switch';
import { siteNavigation } from '@/lib/site-navigation';

export const sections = siteNavigation.map(item => [item.href, item.label, item.code] as const);

export default function StatechartShell({ active, title, subtitle, lead, children }: { active: string; title: string; subtitle: string; lead?: ReactNode; children: ReactNode }) {
  const index = sections.findIndex(([path]) => path === active);
  return <div className="sc-site" data-theme-view="statechart">
    <a className="sc-skip" href="#sc-main">跳到正文</a>
    <header className="sc-masthead"><Link className="sc-brand" href="/"><span>{siteProfile.name.slice(0, 1)}</span><div><b>{siteProfile.siteName}</b><small>一本持续书写的个人档案</small></div></Link><p>A LIVING PERSONAL ARCHIVE<br /><span>经历有出处，判断有来路。</span></p><SiteThemeSwitch current="statechart" /></header>
    <div className="sc-book"><aside className="sc-index"><span className="sc-kicker">CONTENTS / 目录</span><nav aria-label="站点目录">{sections.map(([href, label], i) => <Link key={href} href={href} aria-current={active === href ? 'page' : undefined}><small>{String(i + 1).padStart(2, '0')}</small><span>{label}</span><span aria-hidden="true">{active === href ? '●' : '→'}</span></Link>)}</nav><p className="sc-margin-note">沿着红线翻阅。<br />每张纸片，都有来处。</p><a href="https://github.com/kevintngo/statechart-art" target="_blank" rel="noreferrer" className="sc-credit">Drawn with statechart-art ↗</a></aside>
      <main id="sc-main" className="sc-main">{lead}<header className="sc-page-heading"><span className="sc-kicker">PLATE {String(index + 1).padStart(2, '0')} / {sections[index]?.[2] || 'NOTE'}</span><h1>{title}</h1><p>{subtitle}</p></header>{children}<footer className="sc-colophon"><span>{siteProfile.siteName} · 记忆与对话</span><Link href="/agent">查看资料与引用的边界 ↗</Link><a href="#sc-main">回到页首 ↑</a></footer></main>
    </div>
  </div>;
}
