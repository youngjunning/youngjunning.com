// Lucian UX/UI Prompt #260 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#260
'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { recordKinds } from '@/lib/record-kinds';
import type { PersonalRecord } from '@/lib/record-types';
import './lucian-260.css';

function emphasized(text: string, index: number) {
  return ['通用知识', '经历', '判断', '选择', '状态变化', '记录', '想法', '真实的自己'].some((term) => {
    let start = text.indexOf(term);
    while (start !== -1) {
      if (index >= start && index < start + term.length) return true;
      start = text.indexOf(term, start + term.length);
    }
    return false;
  });
}

export default function RecordStories({ records }: { records: PersonalRecord[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current!;
    const stories = [...root.querySelectorAll<HTMLElement>('.record-story')];
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    function draw() {
      frame = 0;
      stories.forEach((story) => {
        const rect = story.getBoundingClientRect();
        const progress = media.matches ? 1 : Math.max(0, Math.min(1, (innerHeight * .92 - rect.top) / (innerHeight * .7)));
        const words = [...story.querySelectorAll<HTMLElement>('.u260-w')];
        const filled = progress * 1.15 * words.length;
        words.forEach((word, index) => { const value = Math.max(0, Math.min(1, filled - index));word.style.setProperty('--f', value.toFixed(2));word.classList.toggle('on', value >= 1); });
        story.querySelector<HTMLElement>('.u260-pg i')!.style.transform = `scaleY(${Math.min(1, progress * 1.15).toFixed(3)})`;
        story.classList.toggle('is-done', progress * 1.15 >= 1);
      });
    }
    function scroll() { if (!frame) frame = requestAnimationFrame(draw); }
    window.addEventListener('scroll', scroll, { passive: true });window.addEventListener('resize', scroll);media.addEventListener('change', scroll);scroll();
    return () => { cancelAnimationFrame(frame);window.removeEventListener('scroll', scroll);window.removeEventListener('resize', scroll);media.removeEventListener('change', scroll); };
  }, [records]);
  return <div className="record-stories" ref={rootRef}>{records.slice(0, 2).map((record, index) => <article className="ux u260 record-story" key={record.id}><div className="u260-sc"><div className="u260-run"><div className="u260-pin">
    <p className="u260-k"><span className="record-story-index">0{index + 1}</span><time>{record.date || record.recordedAt}</time><span>{recordKinds.find((kind) => kind.id === record.kind)?.label}</span></p>
    <p className="u260-p" aria-label={record.text}>{Array.from(record.text).map((letter, i) => <span className={`u260-w ${emphasized(record.text, i) ? 'em' : ''}`} aria-hidden="true" key={i}>{letter}</span>)}</p>
    <div className="record-story-foot"><p>{record.context}</p><Link className="u260-nx" href={`/records/${record.id}`}>查看这条记录 <span>↗</span></Link></div><span className="u260-pg" aria-hidden="true"><i /></span>
  </div></div></div></article>)}</div>;
}
