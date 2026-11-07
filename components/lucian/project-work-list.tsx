// Lucian UX/UI Prompt #050 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#050
// Lucian UX/UI Prompt #251 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#251
'use client';
import Link from 'next/link';
import { type PointerEvent } from 'react';
import './lucian-050.css';

type Project = { name: string; label: string; description: string; role: string; tags: string[]; href: string };
export default function ProjectWorkList({ projects }: { projects: Project[] }) {
  function move(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return;
    const root = event.currentTarget, rect = root.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
    root.classList.add('is-live');root.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);root.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.style.setProperty('--tx', (x - .5).toFixed(3));root.style.setProperty('--ty', (y - .5).toFixed(3));
    root.style.setProperty('--ry', `${((x - .5) * 14).toFixed(2)}deg`);root.style.setProperty('--rx', `${((.5 - y) * 10).toFixed(2)}deg`);
  }
  function leave(event: PointerEvent<HTMLElement>) {
    const root = event.currentTarget;root.classList.remove('is-live');
    root.style.setProperty('--rx', '0deg');root.style.setProperty('--ry', '0deg');root.style.setProperty('--tx', '0');root.style.setProperty('--ty', '0');
  }
  return <div className="project-showcase" aria-label="代表项目">{projects.map((project, index) => <div className="motion-reveal project-reveal" key={project.name}><article className={`ux u050 project-card project-tone-${index}`} onPointerMove={move} onPointerLeave={leave}>
    <Link className="u050-card" href={project.href}><span className="u050-glare" aria-hidden="true" /><div className="u050-img" aria-hidden="true"><i /><i /><i /><b>0{index + 1} / {project.label}</b><span className="project-art-name">{project.name}</span></div>
    <div className="u050-body"><div className="u050-src"><i aria-hidden="true" />{project.label}<span className="u050-dot" aria-hidden="true" /></div><h3 className="u050-h">{project.name}</h3><p className="u050-p">{project.description}</p><p className="project-contribution"><span>我的参与</span>{project.role}</p></div>
    <div className="u050-foot"><span className="project-tech-tags">{project.tags.join(' · ')}</span><span className="u050-btn">查看实践 <span aria-hidden="true">↗</span></span></div></Link>
  </article></div>)}</div>;
}
