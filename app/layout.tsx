import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Fingerprint } from 'lucide-react';
import persona from '@/content/persona.json';
import './globals.css';
export const metadata: Metadata = { metadataBase: new URL(persona.domain), title: { default: '硅基俊宁 · 记录与思考', template: '%s · 硅基俊宁' }, description: persona.bio };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><a href="#main" className="skip-link">跳到正文</a>
    <header className="header shell"><Link href="/" className="brand"><span className="brand-icon"><Fingerprint size={22} /></span>硅基俊宁<span className="brand-dot">.</span></Link>
      <nav aria-label="主导航"><Link href="/resume">简历</Link><Link href="/records">记录</Link><Link href="/blog">文章</Link><Link href="/favorites">收藏</Link><Link href="/chat" className="nav-chat" aria-label="与我对话">与我对话 <ArrowUpRight size={15} /></Link></nav>
    </header>
    <main id="main" className="shell">{children}</main>
    <footer className="footer shell"><span>© 2026 俊宁<span className="footer-note"> · 记录思考，也记录变化</span></span><div><Link href="/protocol">蒸馏协议</Link><a href={persona.github} target="_blank" rel="noreferrer">GitHub ↗</a><a href="/api/records">开放数据 ↗</a></div></footer>
  </body></html>;
}
