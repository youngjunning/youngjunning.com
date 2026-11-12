'use client';

import { useSyncExternalStore } from 'react';

const themes = [
  { id: 'classic', label: '原版' },
  { id: 'statechart', label: '纸上状态图' },
  { id: 'xiaoxiang', label: '小香风' },
] as const;
type SiteTheme = (typeof themes)[number]['id'];

function getTheme(): SiteTheme {
  const value = document.documentElement.dataset.theme;
  return themes.some((theme) => theme.id === value) ? value as SiteTheme : 'classic';
}

export default function SiteThemeSwitch({ current }: { current: SiteTheme }) {
  const selected = useSyncExternalStore(() => () => {}, getTheme, () => current);
  function choose(next: SiteTheme) {
    if (next === selected) return;
    document.cookie = `zisheng-site-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    window.location.reload();
  }
  return <div className="site-theme-switch" role="group" aria-label="整站主题" title="切换主题会重新加载当前页面；对话仅保留在当前页面">
    <span>主题</span>
    {themes.map((theme) => <button key={theme.id} type="button" aria-pressed={selected === theme.id} onClick={() => choose(theme.id)}>{theme.label}</button>)}
  </div>;
}
