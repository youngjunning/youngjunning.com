'use client';

export default function SiteThemeSwitch({ current }: { current: 'classic' | 'statechart' }) {
  function change() {
    const next = current === 'classic' ? 'statechart' : 'classic';
    document.cookie = `zisheng-site-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    window.location.reload();
  }
  return <button className="site-theme-switch" type="button" onClick={change} title="切换整套页面布局；对话仅保留在当前页面">主题：{current === 'classic' ? '原版 → 纸上状态图' : '纸上状态图 → 原版'}</button>;
}
