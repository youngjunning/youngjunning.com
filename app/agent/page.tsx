import { siteProfile } from '@/lib/site-profile.mjs';
import { getSiteTheme } from '@/lib/site-theme';
import { StatechartAgent } from '@/components/statechart/pages';
import Shell from '@/components/shell';
import SignalLink from '@/components/lucian/signal-link';
import { agentBaseUrl, agentEndpoints, readerSkill, readerInstallSteps } from '@/lib/agent-access';
import './agent.css';

export const metadata = { title: `接入${siteProfile.siteName} · Skill 与 API` };
export default async function AgentPage() {
  if (await getSiteTheme() === 'statechart') return <StatechartAgent />;
  return <Shell active="agent"><section className="page-intro compact"><div className="eyebrow">FOR YOUR AGENT</div><h1>把{siteProfile.siteName}<span>接入你的 Agent。</span></h1><p>通过读取 Skill 查找{siteProfile.name}的记录、文章、百宝箱与探索问题，依据实际资料回答并附来源。也可以直接使用同一组只读接口。</p></section>
    <section className="library-content agent-content">
      <section id="install" className="agent-install" aria-labelledby="agent-install-title"><span className="eyebrow">READING SKILL / 完整下载包</span><h2 id="agent-install-title">{siteProfile.siteName}读取 Skill</h2><p>{siteProfile.readerAccess}读取脚本要求 Node.js 18+，无需额外模型 key。</p><div className="identity-actions"><SignalLink href={readerSkill.archiveUrl} label={`下载${siteProfile.siteName} Skill`} download={`${siteProfile.reader.directory}.zip`} /><a className="text-link" href={siteProfile.reader.manifestUrl}>查看文件校验值 ↗</a></div><ol>{readerInstallSteps.map(step => <li key={step}>{step}</li>)}</ol><p>可以先问：“{siteProfile.name}最近关注哪些 Agent 话题？请引用记录和文章。”</p><details><summary>包内容与维护来源</summary><p>包内包含 SKILL.md、展示元数据、读取脚本与接口说明。技能名称为 {siteProfile.reader.name}，目录为 {siteProfile.reader.directory}；按所用工具的安装方式导入整个目录。</p><p>下载包 SHA-256：<code>{readerSkill.sha256}</code></p><a className="text-link" href={siteProfile.readerSourceUrl} target="_blank" rel="noreferrer">查看唯一维护源 ↗</a></details></section>
      <h2>直接读取 API</h2><p>默认站点：<code>{agentBaseUrl}</code>。以下均为 GET；读取 Skill 的检索范围以下载包说明为准，其他接口可直接访问。</p><div className="endpoint-list">{agentEndpoints.map(([path, label, description]) => <a key={path} href={path} className="endpoint"><div><h3>{label}</h3><p>{description}</p></div><code>{agentBaseUrl}{path}</code><span>↗</span></a>)}</div>
      <div className="agent-notes"><h2>读取与蒸馏各自做什么</h2><p>读取 Skill 让其他 Agent 使用本站允许分享的内容；memory-distill 负责从获准材料整理、核对并保存内容。下载读取 Skill 不会取得写入记忆、修改记录或执行代办的权限。</p><p>个人判断依据本人明确表达；收藏、资料整理和 AI 解释分别说明归属。主题相关不等于引用，引用不证明因果，收藏不表示采用。</p><p>访问失败与没有检索到内容分别报告。接口、原文与下载包沿用站点现有访问控制；安装后的读取仍需站点权限。</p></div>
    </section></Shell>;
}
