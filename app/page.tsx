import Link from 'next/link';
import { ArrowRight, ArrowUpRight, AudioLines, Bot, Code2, Command, Fingerprint, Globe2, MessageCircle, Orbit, Sparkles } from 'lucide-react';
import { BlurFade } from '@/components/magicui/blur-fade';
import { BentoCard, BentoGrid } from '@/components/magicui/bento-grid';
import { getContent } from '@/lib/content';
import persona from '@/content/persona.json';

export default function Home() {
  const { records, favorites, posts } = getContent();
  return <>
    <section className="stage-hero" aria-labelledby="stage-title"><div className="stage-grid" aria-hidden="true" /><div className="stage-aura stage-aura-one" aria-hidden="true" /><div className="stage-aura stage-aura-two" aria-hidden="true" />
      <BlurFade className="stage-hero-content"><div className="stage-kicker"><span className="stage-live" /> 俊宁的数字分身 <span> / DIGITAL SELF</span></div>
        <h1 id="stage-title">让经历成为<span className="stage-headline-glow">下一次创造</span>的起点<span className="stage-period">.</span></h1>
        <p className="stage-lead">我是俊宁，阿里高级工程师、AI 开发者。<br />在这里，记录真实的实践、判断和持续变化。</p>
        <div className="stage-actions"><Link href="/chat" className="stage-button stage-button-primary"><MessageCircle size={17} />和我聊聊<ArrowUpRight size={17} /></Link><Link href="/records" className="stage-button stage-button-ghost">探索我的经历<ArrowRight size={17} /></Link></div>
        <div className="stage-meta"><span>AI APPLICATIONS</span><span>AI BROWSER</span><span>AGENT</span><span>AI INFRA</span></div>
      </BlurFade>
      <div className="stage-orbit" aria-hidden="true"><div className="stage-orbit-ring stage-orbit-ring-outer" /><div className="stage-orbit-ring stage-orbit-ring-inner" /><div className="stage-orbit-core"><Fingerprint size={75} strokeWidth={1} /><span>JUNNING / 01</span></div><span className="stage-orbit-node stage-orbit-node-one"><Bot size={20} /></span><span className="stage-orbit-node stage-orbit-node-two"><Code2 size={20} /></span><span className="stage-orbit-node stage-orbit-node-three"><Globe2 size={20} /></span><span className="stage-orbit-label">HUMAN × MACHINE<br />IN CONTINUOUS MOTION</span></div>
    </section>

    <div className="section-caption stage-caption"><span>01 / 认识俊宁</span><span>BUILT FROM EXPERIENCE</span></div>
    <BentoGrid className="stage-bento">
      <BentoCard label="IDENTITY / 关于" title="从工程实践出发" description="10 年研发经验，现专注 AI 应用、AI 浏览器、Agent、AI Infra 与软件工程。" href="/resume" className="about-card"><div className="stage-card-visual stage-identity-visual" aria-hidden="true"><div className="stage-identity-ring"><Fingerprint size={70} strokeWidth={1} /></div><span className="stage-visual-code">01 // ALWAYS BUILDING</span></div></BentoCard>
      <BentoCard label="FOCUS / 正在关注" title="把想法做成真实产品" description="从业务问题和架构判断出发，用 AI 放大执行力。" href="/records" className="focus-card"><div className="stage-card-visual stage-focus-visual" aria-hidden="true"><span><Bot size={16} /> Agent</span><span><Globe2 size={16} /> Browser</span><strong><Command size={23} /> BUILD WITH AI</strong><span><Code2 size={16} /> Engineering</span></div></BentoCard>
      <BentoCard label="CONVERSATION / 数字分身" title="从有来源的内容开始对话" description="根据公开记录和文章寻找线索，继续一次有依据的交流。" href="/chat" className="conversation-card"><div className="stage-card-visual stage-conversation-visual" aria-hidden="true"><div className="stage-signal"><AudioLines size={46} strokeWidth={1.2} /><span className="stage-signal-pulse" /></div><span className="stage-visual-code">SIGNAL CONNECTED <Sparkles size={12} /></span></div></BentoCard>
    </BentoGrid>

    <section className="recent"><div className="section-heading"><div><span className="eyebrow">02 / IN THE MOMENT</span><h2>最近的判断与记录<span className="tiny-dot">●</span></h2></div><Link href="/records">全部记录 <ArrowRight size={16} /></Link></div>
      {records.slice(0, 3).map((record) => <Link className="record-row" href={'/records/' + record.id} key={record.id}><div className="record-date">{record.date || '时间未详'}<span>{record.kind === 'judgment' ? '判断' : '记录'}</span></div><div><h3>{record.title}</h3><p>{record.text}</p></div><ArrowUpRight size={22} /></Link>)}
    </section>
    <section className="library-strip"><div><span className="eyebrow">A LIVING ARCHIVE</span><h2>每次积累，都能找到来处。</h2><p>记录保留上下文，文章展开思考，收藏留住值得再看的资料。</p></div><div className="stats"><Link href="/records"><strong>{String(records.length).padStart(2, '0')}</strong><span>个人记录 ↗</span></Link><Link href="/blog"><strong>{String(posts.length).padStart(2, '0')}</strong><span>精选文章 ↗</span></Link><Link href="/favorites"><strong>{String(favorites.length).padStart(2, '0')}</strong><span>值得收藏 ↗</span></Link></div></section>
    <div className="closing-line"><span><Orbit size={15} /> 保持好奇，持续构建。</span><a href={persona.github} target="_blank" rel="noreferrer">FIND ME ON GITHUB <ArrowUpRight size={16} /></a></div>
  </>;
}
