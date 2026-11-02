import type { Metadata } from 'next';
import Link from 'next/link';
import { Ellipsis, Fingerprint, MessageCircle, Milestone, Network, NotebookPen, Orbit, PackageOpen, Wrench, BookOpen } from 'lucide-react';
import persona from '@/content/persona.json';
import './globals.css';
import './stage.css';
export const metadata: Metadata = { metadataBase: new URL(persona.domain), title: { default: '硅基俊宁 · 记录与思考', template: '%s · 硅基俊宁' }, description: persona.bio };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><a href="#main" className="skip-link">跳到正文</a>
    <header className="header shell"><Link href="/" className="brand"><span className="brand-icon"><Fingerprint size={22} /></span><span>硅基俊宁<small>DIGITAL SELF · JUNNING</small></span></Link>
      <nav className="stage-nav" aria-label="主导航">
        <Link href="/" title="首页"><Orbit size={15} />小宇宙</Link><Link href="/records" title="个人记录"><Milestone size={15} />来时路</Link><Link href="/blog" title="博客"><NotebookPen size={15} />脑洞手记</Link><Link href="/favorites" title="收藏夹"><PackageOpen size={15} />百宝箱</Link><Link href="/graph" title="资料关联图谱"><Network size={15} />知识星图</Link><Link href="/chat" title="对话"><MessageCircle size={15} />聊两句</Link>
        <details className="stage-more"><summary><Ellipsis size={17} />更多</summary><div className="stage-more-menu"><Link href="/skills"><Wrench size={16} />技能树</Link><Link href="/wiki"><BookOpen size={16} />Wiki</Link><Link href="/engineering"><Network size={16} />工程资料</Link><Link href="/resume"><Fingerprint size={16} />简历</Link></div></details>
      </nav>
    </header>
    <main id="main" className="shell">{children}</main>
    <footer className="footer shell"><span>© 2026 俊宁<span className="footer-note"> · 记录思考，也记录变化</span></span><div><a href="https://design.youngjunning.com/">设计图鉴 ↗</a><a href="https://mastra.youngjunning.com/">Mastra 文档 ↗</a><Link href="/protocol">蒸馏协议</Link><a href={persona.github} target="_blank" rel="noreferrer">GitHub ↗</a><a href="/api/records">开放数据 ↗</a></div></footer>
  </body></html>;
}
