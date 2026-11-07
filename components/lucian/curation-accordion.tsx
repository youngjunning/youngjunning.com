// Lucian UX/UI Prompt #044 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#044
'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import './curation-accordion.css';

export type CurationPanel = { id: string; title: string; meta: string; preview: string; body: ReactNode };

export default function CurationAccordion({ panels, empty }: { panels: CurationPanel[]; empty: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const baseId = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowDown' ? index + 1 : event.key === 'ArrowUp' ? index - 1
      : event.key === 'Home' ? 0 : event.key === 'End' ? panels.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    buttons.current[(next + panels.length) % panels.length]?.focus();
  }

  if (!panels.length) return <div className="curation-empty">{empty}</div>;
  return <div className="ux u044 curation-accordion">
    {panels.map((panel, index) => {
      const open = openId === panel.id;
      const buttonId = `${baseId}-q-${index}`;
      const bodyId = `${baseId}-a-${index}`;
      return <article className={`u044-it${open ? ' open' : ''}`} id={panel.id} key={panel.id}>
        <button className="u044-q" type="button" ref={node => { buttons.current[index] = node; }}
          id={buttonId} aria-expanded={open} aria-controls={bodyId}
          onClick={() => setOpenId(open ? null : panel.id)} onKeyDown={event => onKeyDown(event, index)}>
          <span className="u044-n">{String(index + 1).padStart(2, '0')}</span>
          <span className="u044-t"><small>{panel.meta}</small><strong>{panel.title}</strong><span className="curation-preview">{panel.preview}</span></span>
          <span className="u044-toggle" aria-hidden="true">{open ? '收起详情' : '查看详情'}</span>
        </button>
        <div className="u044-body" id={bodyId} role="region" aria-labelledby={buttonId}>
          <div><div className="u044-a">{panel.body}</div></div>
        </div>
      </article>;
    })}
  </div>;
}
