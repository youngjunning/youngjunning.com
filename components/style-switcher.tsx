'use client';
import { useEffect, useState } from 'react';
type SiteStyle = 'magic' | 'react-bits';
export function StyleSwitcher() {
  const [style, setStyle] = useState<SiteStyle>('react-bits');
  useEffect(() => { setStyle(document.documentElement.dataset.style === 'magic' ? 'magic' : 'react-bits'); }, []);
  function select(next: SiteStyle) {
    setStyle(next);
    document.documentElement.dataset.style = next;
    try { localStorage.setItem('junning-style', next); } catch { /* Storage is optional. */ }
  }
  return <div className="style-switcher" role="group" aria-label="界面风格">
    <button type="button" aria-pressed={style === 'magic'} onClick={() => select('magic')}>经典纸白</button>
    <button type="button" aria-pressed={style === 'react-bits'} onClick={() => select('react-bits')}>数字花园</button>
  </div>;
}
