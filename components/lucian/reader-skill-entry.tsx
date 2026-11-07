import { siteProfile } from '@/lib/site-profile.mjs';
import Link from 'next/link';
import { readerSkill } from '@/lib/agent-access';
import SignalLink from './signal-link';

export default function ReaderSkillEntry() {
  return <aside className="identity-skill" aria-labelledby="reader-skill-title">
    <div><span className="eyebrow">FOR YOUR AGENT / 读取 SKILL</span><h2 id="reader-skill-title">让你的 Agent 认识{siteProfile.name}。</h2><p>读取经历、文章与百宝箱，回答附来源。{siteProfile.readerAccess}</p></div>
    <div className="identity-actions"><SignalLink href={readerSkill.archiveUrl} label={`下载${siteProfile.siteName} Skill`} download={`${siteProfile.reader.directory}.zip`} /><Link className="text-link" href="/agent#install">接入说明与 API ↗</Link></div>
  </aside>;
}
