'use client';
// Adapted from React Bits SpotlightCard. See THIRD_PARTY_NOTICES.md.
import Link from 'next/link';
import type { ReactNode, PointerEvent } from 'react';
export function SpotlightCard({ children, href, className }: { children: ReactNode; href: string; className: string }) {
  function move(event: PointerEvent<HTMLAnchorElement>) {
    if (document.documentElement.dataset.style !== 'react-bits' || event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = event.currentTarget;
    const rect = root.getBoundingClientRect();
    root.style.setProperty('--spotlight-x', `${event.clientX - rect.left}px`);
    root.style.setProperty('--spotlight-y', `${event.clientY - rect.top}px`);
  }
  return <Link href={href} className={`${className} spotlight-card`} onPointerMove={move}>
    <span className="spotlight-card-light" aria-hidden="true" />{children}
  </Link>;
}
