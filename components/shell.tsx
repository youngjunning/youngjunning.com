// Lucian UX/UI Prompt #212 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#212
// Lucian UX/UI Prompt #039 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#039
// Lucian UX/UI Prompt #037 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#037
'use client';

import { siteProfile } from '@/lib/site-profile.mjs';
import Link from 'next/link';
import { Ellipsis, MessageCircle, Milestone, NotebookPen, Orbit, PackageOpen } from 'lucide-react';
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import persona from '@/lib/persona';
import { siteNavigation, type SiteSection } from '@/lib/site-navigation';
import ThemePicker from './lucian/theme-picker';
import SiteThemeSwitch from './site-theme-switch';
import ImagePreview from './lucian/image-preview';
import SiteVisitStats from './lucian/site-visit-stats';
import { useSurfaceGlow } from './lucian/site-effects';
import './lucian/site-effects.css';
import './lucian/lucian-212.css';
import './lucian/lucian-039.css';
import './lucian/lucian-037.css';
import './lucian/site.css';
import './lucian/themes.css';
import './lucian/shell.css';

const icons = { home: Orbit, records: Milestone, library: NotebookPen, favorites: PackageOpen, chat: MessageCircle };
const items = siteNavigation.filter(item => item.primary).map(item => ({ ...item, icon: icons[item.id as keyof typeof icons] }));
const moreItems = siteNavigation.filter(item => !item.primary).map(item => ({ ...item, mark: item.code.slice(0, 1) }));

function highlightMoreItem(link: HTMLAnchorElement) {
  const list = link.closest('.u037-list');
  const highlight = list?.querySelector<HTMLElement>('.u037-hl');
  if (!highlight || !link.parentElement) return;
  highlight.style.setProperty('--y', `${link.parentElement.offsetTop}px`);
  highlight.style.setProperty('--h', `${link.offsetHeight}px`);
  list?.classList.add('is-hl');
}

export default function Shell({ children, active = 'library', toolbar }: { children: ReactNode; active?: SiteSection | null; toolbar?: ReactNode }) {
  const moreActive = moreItems.some((item) => item.id === active);
  const hasActiveNavItem = moreActive || items.some((item) => item.id === active);
  const rootRef = useRef<HTMLDivElement>(null);
  useSurfaceGlow(rootRef);
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const morePanelRef = useRef<HTMLDivElement>(null);
  const morePanelId = useId();

  useEffect(() => {
    if (!moreOpen) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !moreRef.current?.contains(event.target)) setMoreOpen(false);
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [moreOpen]);

  function onMoreKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && moreOpen) {
      event.preventDefault();
      setMoreOpen(false);
      moreTriggerRef.current?.focus();
      return;
    }
    const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (event.target === moreTriggerRef.current && direction) {
      event.preventDefault();
      setMoreOpen(true);
      requestAnimationFrame(() => {
        const links = morePanelRef.current?.querySelectorAll<HTMLAnchorElement>('a');
        links?.[direction > 0 ? 0 : links.length - 1]?.focus();
      });
    } else if (moreOpen && (direction || event.key === 'Home' || event.key === 'End')) {
      const links = Array.from(morePanelRef.current?.querySelectorAll<HTMLAnchorElement>('a') || []);
      const index = links.findIndex((link) => link === event.target);
      if (index < 0) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : (index + direction + links.length) % links.length;
      links[next]?.focus();
    }
  }

  useEffect(() => {
    let previous = window.scrollY;
    let accumulation = 0;
    let raf = 0;
    function update() {
      raf = 0;
      const y = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progressRef.current?.style.setProperty('--p', String(Math.min(1, y / max)));
      const delta = y - previous;
      previous = y;
      accumulation = Math.sign(delta) === Math.sign(accumulation) ? accumulation + delta : delta;
      setSolid(y > 20);
      if (y < 80) setHidden(false);
      else if (accumulation > 12) setHidden(true);
      else if (accumulation < -8) setHidden(false);
    }
    function onScroll() { if (!raf) raf = requestAnimationFrame(update); }
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;
    const current = nav.querySelector<HTMLElement>('[data-nav-active="true"]');
    if (!current) return;
    function position() {
      pill!.style.setProperty('--x', `${current!.getBoundingClientRect().left - nav!.getBoundingClientRect().left - nav!.clientLeft}px`);
      pill!.style.setProperty('--w', `${current!.offsetWidth}px`);
    }
    const observer = new ResizeObserver(position);
    observer.observe(nav);
    position();
    return () => observer.disconnect();
  }, [active]);

  return <div ref={rootRef} data-section={active} className={`ux u212 site-shell ${solid ? 'is-solid' : ''} ${hidden && !moreOpen ? 'is-hide' : ''}`}>
    <header className="u212-hd site-header">
      <Link href="/" className="site-identity" aria-label={`${persona.siteName}首页`}><span className="site-identity-mark" aria-hidden="true">{siteProfile.name.slice(0, 1)}</span><span>{persona.siteName}<small>{persona.siteSubtitle}</small></span></Link>
      <nav className="u039-tabs site-nav" aria-label="主导航" ref={navRef}>
        {hasActiveNavItem && <span className="site-nav-highlight" aria-hidden="true"><span className="u039-pill" ref={pillRef} /></span>}
        {items.map((item) => <Link className="u039-tab" key={item.id} href={item.href} title={item.meaning} aria-label={`${item.label} · ${item.meaning}`} data-nav-active={active === item.id ? 'true' : undefined} aria-current={active === item.id ? 'page' : undefined} onClick={() => setMoreOpen(false)}><item.icon className="site-nav-icon" size={14} strokeWidth={1.9} aria-hidden="true" />{item.label}</Link>)}
        <div className={`ux u037 site-nav-more${moreOpen ? ' is-open' : ''}`} ref={moreRef} onKeyDown={onMoreKeyDown} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setMoreOpen(false); }}>
          <button className="u039-tab site-more-trigger" type="button" ref={moreTriggerRef} aria-haspopup="menu" aria-expanded={moreOpen} aria-controls={morePanelId} data-nav-active={moreActive ? 'true' : undefined} onClick={() => setMoreOpen((open) => !open)}><Ellipsis className="site-nav-icon" size={14} strokeWidth={1.9} aria-hidden="true" />更多<svg className="u037-car" viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg></button>
          <div className="u037-menu" id={morePanelId} ref={morePanelRef} role="menu" aria-label="更多导航" aria-hidden={!moreOpen}>
            <p className="u037-sec">再逛逛</p>
            <ul className="u037-list" role="none" onPointerLeave={(event) => event.currentTarget.classList.remove('is-hl')}>
              <li className="u037-hl" role="presentation" />
              {moreItems.map((item, index) => <li key={item.id} role="none"><Link className="u037-it" href={item.href} role="menuitem" aria-current={active === item.id ? 'page' : undefined} tabIndex={moreOpen ? 0 : -1} style={{ '--i': index } as CSSProperties} onPointerEnter={(event) => highlightMoreItem(event.currentTarget)} onFocus={(event) => highlightMoreItem(event.currentTarget)} onClick={() => setMoreOpen(false)}><span className="u037-ws" aria-hidden="true">{item.mark}</span><span><b>{item.label}</b><small>{item.meaning}</small></span><svg className="u037-ck" viewBox="0 0 18 18" aria-hidden="true"><path d="m4 9.5 3.5 3.5L14 6" /></svg></Link></li>)}
            </ul>
          </div>
        </div>
      </nav>
      <div className="site-header-actions"><ThemePicker />{toolbar}</div>
      <span className="u212-pg" aria-hidden="true" ref={progressRef} />
    </header>
    <main className="workspace site-workspace">{children}<footer className="page-footer">让每一次判断，都能回到实践。<div className="site-footer-meta"><SiteVisitStats /><span className="site-footer-label">{siteProfile.siteName} · 记忆与对话</span></div></footer></main>
    <div className="classic-theme-access"><SiteThemeSwitch current="classic" /></div>
    <ImagePreview />
  </div>;
}
