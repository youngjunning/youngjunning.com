import type { Metadata } from 'next';
import Shell from '@/components/shell';
import SnapshotLab from './snapshot-lab';
import './snapshot.css';

export const metadata: Metadata = {
  title: 'agent-browser snapshot · 交互演示',
  description: '在同名订单按钮场景中，交互观察 ARIA 快照、ref、nth、裁剪选项与页面变化后的重新验证。',
};

export default function AgentBrowserSnapshotPage() {
  return <Shell active={null}>
    <main className="snapshot-page">
      <header className="snapshot-hero">
        <div className="snapshot-hero-copy">
          <p className="snapshot-eyebrow">INTERACTIVE LAB / 固定源码演示</p>
          <h1>同名按钮，<br /><em>不同订单。</em></h1>
          <p>从页面语义到 <code>@eN</code> 引用，再到动作后的结果核对。用一张订单页看清 agent-browser 旧版 <code>snapshot.ts</code> 的能力与边界。</p>
          <div className="snapshot-hero-links"><a className="snapshot-primary-link" href="#lab">开始演示 <span aria-hidden="true">↘</span></a><a href="/blog/464258397d391ba6">阅读完整拆解 ↗</a></div>
        </div>
        <div className="snapshot-hero-art" role="img" aria-label="两张订单卡片，其中第二张被光束高亮" />
      </header>

      <section className="snapshot-intro" aria-label="演示步骤">
        <div><span>01</span><strong>观察页面</strong><p>生成带 ref 的语义文本。</p></div>
        <div><span>02</span><strong>选择目标</strong><p>同时核对按钮和订单号。</p></div>
        <div><span>03</span><strong>模拟变化</strong><p>重排后检查旧 ref 的风险。</p></div>
        <div><span>04</span><strong>验证结果</strong><p>操作后重新观察状态。</p></div>
      </section>

      <SnapshotLab />

      <section className="snapshot-explainer" aria-labelledby="snapshot-explainer-title">
        <p className="snapshot-eyebrow">SOURCE NOTES</p>
        <h2 id="snapshot-explainer-title">这个演示对应哪段源码？</h2>
        <div className="snapshot-note-grid">
          <article><span>采集</span><h3>ARIA 文本先到手</h3><p>固定提交先调用 Playwright 的 <code>locator.ariaSnapshot()</code>；演示用本地订单状态构造等价的示意文本，不启动浏览器自动化服务。</p></article>
          <article><span>引用</span><h3>role + name + nth</h3><p>同名按钮按出现顺序保留零基 <code>nth</code>。执行时上游会重建 Locator；演示额外加入订单身份检查，用来揭示重排风险。</p></article>
          <article><span>裁剪</span><h3>越短，线索可能越少</h3><p><code>-i</code> 将交互项平铺；<code>-c</code> 和 <code>-d</code> 改变可见结构；限定范围会隐藏范围外证据。</p></article>
        </div>
        <div className="snapshot-cli"><div><span>REAL BROWSER / 可复现入口</span><h3>用固定版本 CLI 观察此页</h3><p>页面中的订单卡片是真实 DOM。运行以下命令可得到真实 Playwright 快照；引用编号以当次输出为准。</p></div><pre><code>{'agent-browser open https://youngjunning.com/agent-browser-snapshot\nagent-browser snapshot -s ".snapshot-browser-body"\nagent-browser snapshot -s ".snapshot-browser-body" -i'}</code></pre></div>
        <p className="snapshot-source-line">依据：<a href="https://github.com/vercel-labs/agent-browser/blob/e02bc1a10cf8962a2a171d2b515f14e325dc97ab/src/snapshot.ts" target="_blank" rel="noopener noreferrer">固定版本 snapshot.ts ↗</a> · <a href="https://github.com/vercel-labs/agent-browser/blob/e02bc1a10cf8962a2a171d2b515f14e325dc97ab/src/browser.ts#L295-L322" target="_blank" rel="noopener noreferrer">ref 定位实现 ↗</a> · <a href="/blog/464258397d391ba6">文章与适用边界 ↗</a></p>
      </section>
    </main>
  </Shell>;
}
