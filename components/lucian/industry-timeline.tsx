// Lucian UX/UI Prompt #271 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#271
'use client';

import { useState } from 'react';
import type { IndustryItem } from '@/lib/industry-feed';
import './industry-timeline.css';

function dateLabel(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return '时间未标注';
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(value));
}

export default function IndustryTimeline({ items }: { items: IndustryItem[] }) {
  const categories = [...new Set(items.map(item => item.category).filter((value): value is string => Boolean(value)))].slice(0, 3);
  const filters = ['全部', ...categories];
  const [active, setActive] = useState(0);
  return <div className="ux u271 industry-timeline">
    <div className="u271-hd">
      <h3>最近 7 天</h3><p>由本站自建资讯源筛选 · {items.length} 条</p>
      {categories.length > 0 && <div className="u271-cs" role="radiogroup" aria-label="按分类筛选">
        <span className="u271-pl" aria-hidden="true" style={{ transform: `translateX(${active * 100}%)`, width: `${100 / filters.length}%` }} />
        {filters.map((label, index) => <button className={`u271-ch${active === index ? ' is-on' : ''}`} key={label} type="button" role="radio" aria-checked={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => {
          const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
          if (step) {
            event.preventDefault();
            const next = (index + step + filters.length) % filters.length;
            setActive(next);
            event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('.u271-ch')[next]?.focus();
          }
        }}>{label}<i>{index === 0 ? items.length : items.filter(item => item.category === label).length}</i></button>)}
      </div>}
    </div>
    <div className="u271-sc" tabIndex={0} aria-label="行业动态列表"><div className="u271-tl">
      {items.map((item, index) => {
        const hidden = active > 0 && item.category !== filters[active];
        return <div className={`u271-en${hidden ? ' is-off' : ''}`} aria-hidden={hidden} key={item.id}><div><article className="u271-in">
          <span className={`u271-dt${index === 0 ? ' is-new' : ''}`} aria-hidden="true" />
          <div className="u271-mt"><b>{item.source}</b><span>· {dateLabel(item.publishedAt)}</span>{item.category && <span className="u271-tg">{item.category}</span>}</div>
          <h4><a href={item.itemUrl} target="_blank" rel="noopener noreferrer" tabIndex={hidden ? -1 : 0}>{item.title}</a></h4>
          {item.summary && <p>{item.summary}</p>}
          <div className="industry-timeline-links"><a href={item.itemUrl} target="_blank" rel="noopener noreferrer" tabIndex={hidden ? -1 : 0}>查看条目 ↗</a>{item.originalUrl && <a href={item.originalUrl} target="_blank" rel="noopener noreferrer" tabIndex={hidden ? -1 : 0}>原始来源 ↗</a>}</div>
        </article></div></div>;
      })}
    </div></div>
  </div>;
}
