// Lucian UX/UI Prompt #251 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#251
'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import './lucian-251.css';
import './secondary-motion.css';

type Props = { id?: string; className?: string; eyebrow: string; title: string; description?: string; action?: ReactNode; children: ReactNode; grid?: boolean };
export default function MotionSection({ id, className = '', eyebrow, title, description, action, children, grid = false }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = rootRef.current!;
    const targets = [...root.querySelectorAll<HTMLElement>('[data-rv],.motion-reveal')];
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | null = null;
    function observe() {
      observer?.disconnect();
      if (media.matches) { targets.forEach((target) => target.classList.add('is-in'));return; }
      observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-in');
        else if (entry.boundingClientRect.top > (entry.rootBounds?.bottom || innerHeight) - 1) entry.target.classList.remove('is-in');
      }), { threshold: .18 });
      targets.forEach((target, index) => { target.style.setProperty('--d', `${Math.max(0, index - 1) % 2 * .09}s`);observer!.observe(target); });
    }
    observe();media.addEventListener('change', observe);
    return () => { observer?.disconnect();media.removeEventListener('change', observe); };
  }, []);
  return <section id={id} ref={rootRef} className={`persona-section ux u251 motion-section ${className}`}>
    <header className="persona-section-heading u251-hd" data-rv><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action || (description && <p>{description}</p>)}</header>
    <div className={grid ? 'u251-gd motion-grid' : 'motion-content'}>{children}</div>
  </section>;
}
