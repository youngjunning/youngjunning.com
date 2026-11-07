// Lucian UX/UI Prompt #044 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#044
'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import type { OkrStore } from '@/lib/okr-types';
import './lucian-044.css';
import './okr-dashboard.css';

export default function OkrDashboard({ store }: { store: OkrStore }) {
  const [expanded, setExpanded] = useState<string | null>(store.objectives[0]?.id ?? null);
  const keyResults = store.objectives.flatMap(objective => objective.keyResults);
  const openQuestions = keyResults.flatMap(kr => (kr.openQuestions ?? []).map(question => ({ keyResultId: kr.id, question })));
  const months = [...new Set(store.materials.map(material => material.month))].sort().reverse();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function followHash() {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const objective = store.objectives.find(item => item.id === id || item.keyResults.some(kr => kr.id === id));
      if (objective) {
        setExpanded(objective.id);
        clearTimeout(timer);
        // Wait for the Lucian disclosure transition before positioning the KR.
        const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 550;
        timer = setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' }), delay);
      }
    }
    followHash();
    window.addEventListener('hashchange', followHash);
    return () => { window.removeEventListener('hashchange', followHash); clearTimeout(timer); };
  }, [store.objectives]);

  function navigate(event: KeyboardEvent<HTMLButtonElement>) {
    const buttons = Array.from(event.currentTarget.closest('.okr-objectives')?.querySelectorAll<HTMLButtonElement>('.u044-q') ?? []);
    const index = buttons.indexOf(event.currentTarget);
    const next = event.key === 'ArrowDown' ? (index + 1) % buttons.length
      : event.key === 'ArrowUp' ? (index - 1 + buttons.length) % buttons.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    buttons[next]?.focus();
  }

  return <div className="ux okr-dashboard">
    <header className="okr-heading">
      <p className="eyebrow">OBJECTIVES & KEY RESULTS · {store.owner}</p>
      <div className="okr-title-line"><h1>{store.period} <span>OKR</span></h1><p>{store.objectives.length} 个目标 · {keyResults.length} 个关键结果</p></div>
      <p className="okr-principle">{store.principle}</p>
    </header>

    <section className="okr-overview" aria-label="S2 投入权重">
      {store.objectives.map(objective => <div key={objective.id} className="okr-allocation">
        <span className="okr-index">{objective.id}</span><strong>{objective.weight}<small>%</small></strong>
        <div><h2>{objective.title}</h2><p>{objective.keyResults.length} 个关键结果 · 投入权重</p></div>
      </div>)}
    </section>

    <div className="okr-columns">
      <section className="okr-goals" aria-labelledby="okr-goals-title">
        <header className="okr-section-heading"><div><p className="eyebrow">S2 PRIORITIES</p><h2 id="okr-goals-title">阶段目标</h2></div><p>目标原文 · 完成度尚未评估</p></header>
        <div className="ux u044 okr-objectives">
          {store.objectives.map(objective => {
            const open = expanded === objective.id;
            return <section key={objective.id} id={objective.id} className={`u044-it ${open ? 'open' : ''}`}>
              <h3><button id={`${objective.id}-trigger`} className="u044-q" type="button" aria-expanded={open} aria-controls={`${objective.id}-body`} onClick={() => setExpanded(open ? null : objective.id)} onKeyDown={navigate}>
                <span className="u044-n">{objective.id}</span><span className="u044-t">{objective.title}<small>{objective.keyResults.length} 个关键结果</small></span>
                <span className="okr-row-weight">{objective.weight}%</span><span className="u044-pm" aria-hidden="true" />
              </button></h3>
              <div className="u044-body" id={`${objective.id}-body`} role="region" aria-labelledby={`${objective.id}-trigger`} aria-hidden={!open} inert={!open}>
                <div><div className="u044-a">
                  <p className="okr-objective-description">{objective.description}</p>
                  <ol className="okr-key-results">
                    {objective.keyResults.map(kr => {
                      const materials = store.materials.filter(material => material.keyResultId === kr.id);
                      return <li id={kr.id} key={kr.id}>
                        <div className="okr-kr-heading"><span>{kr.id}</span><h4>{kr.title}</h4></div>
                        <p>{kr.description}</p>
                        {kr.openQuestions?.map(question => <p className="okr-open-question" key={question}>待明确：{question}</p>)}
                        {materials.map(material => <a key={material.id} href={`#${material.id}`} tabIndex={open ? 0 : -1}>{material.month} 月报素材：{material.title} <i aria-hidden="true">↗</i></a>)}
                      </li>;
                    })}
                  </ol>
                </div></div>
              </div>
            </section>;
          })}
        </div>
        <p className="okr-source">{store.source}</p>
      </section>

      <aside className="okr-support" aria-label="月报素材与待明确指标">
        <section aria-labelledby="okr-materials-title">
          <header className="okr-section-heading"><div><p className="eyebrow">MONTHLY NOTES</p><h2 id="okr-materials-title">月报素材</h2></div><p>{store.materials.length} 条已收录</p></header>
          {months.length === 0 ? <p className="okr-empty">还没有月报素材，后续按月份关联到对应 KR。</p> : months.map(month => <section className="okr-month" key={month}>
            <h3>{month.slice(0, 4)} 年 {Number(month.slice(5))} 月</h3>
            {store.materials.filter(material => material.month === month).map(material => <article id={material.id} className="okr-material" key={material.id}>
              <p className="okr-material-link"><a href={`#${material.keyResultId}`} onClick={() => setExpanded(material.keyResultId.split('-')[0])}>{material.keyResultId} · {keyResults.find(kr => kr.id === material.keyResultId)?.title} ↗</a></p>
              <h4>{material.title}</h4><p>{material.summary}</p>
              {material.images.map(image => <figure key={image.url}>
                {/* User-supplied evidence retains its original aspect ratio and resolution. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.alt} width={image.width} height={image.height} loading="lazy" />
                <figcaption><a href={image.url} target="_blank" rel="noreferrer">查看原图 ↗</a></figcaption>
              </figure>)}
              <p className="okr-evidence-note">{material.evidenceNote}</p>
              <p className="okr-source">{material.source}<br />收录于 {material.recordedAt}</p>
            </article>)}
          </section>)}
        </section>
        {openQuestions.length > 0 && <section className="okr-questions" aria-labelledby="okr-questions-title"><p className="eyebrow">TO CLARIFY</p><h2 id="okr-questions-title">待明确指标</h2>
          {openQuestions.map(({ keyResultId, question }) => <p key={`${keyResultId}-${question}`}><a href={`#${keyResultId}`} onClick={() => setExpanded(keyResultId.split('-')[0])}>{keyResultId} ↗</a><br />{question}</p>)}
        </section>}
      </aside>
    </div>
  </div>;
}
