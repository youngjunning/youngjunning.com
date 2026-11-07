import { siteProfile } from '@/lib/site-profile.mjs';
import Link from 'next/link';
import persona from '@/lib/persona';
import ParticleName from './particle-name';
import SignalLink from './signal-link';
import DecodingHeadline from './decoding-headline';
import ReaderSkillEntry from './reader-skill-entry';
import './identity-hero.css';

export default function IdentityHero({ articleCount, recordCount, projectCount }: { articleCount: number; recordCount: number; projectCount: number }) {
  return <section className="identity-hero" aria-labelledby="identity-title">
    <div className="identity-overline"><span>{persona.siteName} / DIGITAL SELF</span><span>{siteProfile.name}的经历 · 判断 · 手记</span></div>
    <ReaderSkillEntry />
    <h1 id="identity-title" className="identity-sr">我是{persona.siteName}，{persona.siteSubtitle}。</h1>
    <div className="identity-stage"><ParticleName /></div>
    <div className="identity-footer"><DecodingHeadline /><div className="identity-intro"><p><strong>记住{siteProfile.name}的经历，延续有依据的交流。</strong></p><div className="identity-actions"><SignalLink href="/chat" label={`和${persona.siteName}聊聊`} /><Link href="/records" className="secondary-button">个人记录 <span>↗</span></Link></div><div className="identity-count"><span>{articleCount} 篇文章</span><span>{recordCount} 条记录</span><span>{projectCount} 个项目</span><a href="#projects">探索我的实践 ↗</a></div></div></div>
  </section>;
}
