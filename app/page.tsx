import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Fingerprint, Command, Sprout } from 'lucide-react';
import { MagicBook } from '@/components/magic-book';
import { BlurFade } from '@/components/magicui/blur-fade';
import { BentoCard, BentoGrid } from '@/components/magicui/bento-grid';
import { getContent } from '@/lib/content';
import persona from '@/content/persona.json';
import { GradientText } from '@/components/reactbits/gradient-text';
export default function Home() {
  const { records, favorites, posts } = getContent();
  return <>
    <section className="hero"><BlurFade><div className="intro-label"><span className="status-dot" /> A DIGITAL SELF <span className="intro-rule" /></div>
      <h1>人的经历，<br />在硅基世界<GradientText>生长。</GradientText><span className="hero-asterisk" aria-hidden="true"><Sprout strokeWidth={0.7} /></span></h1>
      <div className="hero-bottom"><p>我是俊宁，AI 开发者。<br />这里记录我做过的项目、当时的判断，以及后来的变化。</p><Link href="/chat" className="primary-link">认识另一个我 <ArrowUpRight size={18} /></Link></div>
    </BlurFade></section>
    <div className="section-caption"><span>01 / 认识俊宁</span><span>AN OPEN, EVOLVING PORTRAIT</span></div>
    <BentoGrid>
      <BentoCard label="ABOUT / 关于" title="俊宁" description="阿里高级工程师 · AI 开发者 · 10 年研发经验" href="/resume" className="about-card">
        <div className="identity-art" aria-hidden="true"><div className="identity-orbit orbit-one" /><div className="identity-orbit orbit-two" /><div className="identity-disc"><Fingerprint size={74} strokeWidth={0.8} /></div><span className="art-coordinate">30° N · ALWAYS BUILDING</span></div>
      </BentoCard>
      <BentoCard label="FOCUS / 正在关注" title="从想法到可用的产品" description="AI 应用、AI 浏览器、Agent、AI Infra 与软件工程。" href="/records" className="focus-card"><div className="focus-cloud" aria-hidden="true"><span>Agent</span><span>AI Infra</span><span className="focus-big">Build with AI<Command size={24} /></span><span>Browser</span><span>Engineering</span></div></BentoCard>
      <BentoCard label="CONVERSATION / 数字分身" title="翻开花园里的魔法书" description="带着一个问题，从公开记录与文章里寻找线索。" href="/chat" className="conversation-card"><MagicBook compact /></BentoCard>
    </BentoGrid>
    <section className="recent"><div className="section-heading"><div><span className="eyebrow">02 / 思考的切片</span><h2>最近留下的记录<span className="tiny-dot">●</span></h2></div><Link href="/records">全部记录 <ArrowRight size={16} /></Link></div>
      {records.slice(0, 3).map((record) => <Link className="record-row" href={'/records/' + record.id} key={record.id}><div className="record-date">{record.date || '时间未详'}<span>{record.kind === 'judgment' ? '判断' : '记录'}</span></div><div><h3>{record.title}</h3><p>{record.text}</p></div><ArrowUpRight size={22} /></Link>)}
    </section>
    <section className="library-strip"><div><span className="eyebrow">A LIVING ARCHIVE</span><h2>让每一次积累，都有来处。</h2><p>记录保留上下文，文章展开思考，收藏留住值得再看的资料。</p></div><div className="stats"><Link href="/records"><strong>{String(records.length).padStart(2, '0')}</strong><span>个人记录 ↗</span></Link><Link href="/blog"><strong>{String(posts.length).padStart(2, '0')}</strong><span>精选文章 ↗</span></Link><Link href="/favorites"><strong>{String(favorites.length).padStart(2, '0')}</strong><span>值得收藏 ↗</span></Link></div></section>
    <div className="closing-line"><span>保持好奇，持续构建。</span><a href={persona.github} target="_blank" rel="noreferrer">FIND ME ON GITHUB <ArrowUpRight size={16} /></a></div>
  </>;
}
