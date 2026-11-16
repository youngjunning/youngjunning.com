// Lucian UX/UI Prompt #273 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#273
// Lucian UX/UI Prompt #042 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#042
// Lucian UX/UI Prompt #028 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#028
'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpenText, Check, Lightbulb, Search, X } from 'lucide-react';
import './lucian/lucian-028.css';
import './lucian/lucian-042.css';
import './lucian/feynman-learning.css';

type Confidence = '' | 'review' | 'clear' | 'teach';
type TopicProgress = {
  step: number;
  explanation: string;
  gaps: string;
  simple: string;
  confidence: Confidence;
  completedAt?: string;
};
type LearningStore = { version: 1; activeTopic: string; topics: Record<string, TopicProgress> };
type Topic = { id: string; label: string; headingIndex: number | null };

const blankProgress = (): TopicProgress => ({ step: 1, explanation: '', gaps: '', simple: '', confidence: '' });
const storageKey = (documentId: string) => `feynman-learning:v1:${documentId}`;
const stepLabels = ['选主题', '讲清楚', '查缺口', '再简化'];
const confidenceOptions: Array<{ value: Exclude<Confidence, ''>; label: string; detail: string }> = [
  { value: 'review', label: '还要复习', detail: '仍有关键环节讲不顺' },
  { value: 'clear', label: '基本讲清', detail: '能用自己的话说明' },
  { value: 'teach', label: '可以教人', detail: '能回答追问并举例' },
];

function validStore(value: unknown): value is LearningStore {
  if (!value || typeof value !== 'object') return false;
  const store = value as Partial<LearningStore>;
  return store.version === 1 && typeof store.activeTopic === 'string' && Boolean(store.topics) && typeof store.topics === 'object';
}

function TextArea({ value, onChange, label, placeholder, hint, minLength }: { value: string; onChange: (value: string) => void; label: string; placeholder: string; hint: string; minLength: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const count = Array.from(value.trim()).length;
  useEffect(() => {
    const field = ref.current;
    if (!field) return;
    field.style.height = '0px';
    field.style.height = `${Math.min(260, Math.max(128, field.scrollHeight))}px`;
  }, [value]);
  return <label className="feynman-field">
    <span>{label}</span>
    <span className="feynman-composer u028-box">
      <textarea ref={ref} className="u028-ta" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-describedby={`${label.replace(/\s/g, '-')}-hint`} />
      <span className="feynman-field-foot"><small id={`${label.replace(/\s/g, '-')}-hint`}>{hint}</small><strong className={count < minLength ? '' : 'is-ready'}>{count} 字</strong></span>
    </span>
  </label>;
}

export default function FeynmanLearning({ documentId, title, headings, variant = 'lucian' }: { documentId: string; title: string; headings: string[]; variant?: 'lucian' | 'paper' }) {
  const titleId = useId();
  const descriptionId = useId();
  const openerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [store, setStore] = useState<LearningStore>({ version: 1, activeTopic: 'article', topics: {} });
  const topics = useMemo<Topic[]>(() => [
    { id: 'article', label: `整篇：${title}`, headingIndex: null },
    ...headings.filter(Boolean).map((label, index) => ({ id: `heading-${index}`, label, headingIndex: index })),
  ], [headings, title]);
  const activeTopic = topics.find((topic) => topic.id === store.activeTopic) ?? topics[0];
  const progress = store.topics[activeTopic.id] ?? blankProgress();
  const completed = topics.filter((topic) => store.topics[topic.id]?.completedAt).length;
  const currentStep = Math.max(1, Math.min(4, progress.step));

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const raw = window.localStorage.getItem(storageKey(documentId));
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (validStore(parsed)) setStore(parsed);
        }
      } catch {
        setStorageAvailable(false);
      } finally {
        setReady(true);
      }
    });
    return () => { active = false; };
  }, [documentId]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(storageKey(documentId), JSON.stringify(store));
    } catch {
      queueMicrotask(() => setStorageAvailable(false));
    }
  }, [documentId, ready, store]);

  useEffect(() => {
    if (!open) return;
    const opener = openerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const root = dialogRef.current;
    const focusable = () => [...(root?.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, [href], [tabindex]:not([tabindex="-1"])') ?? [])].filter((item) => !item.hasAttribute('hidden'));
    const timer = window.setTimeout(() => focusable()[0]?.focus(), 20);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    root?.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      root?.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus({ preventScroll: true });
    };
  }, [open]);

  function updateProgress(next: Partial<TopicProgress>) {
    setStore((current) => ({ ...current, topics: { ...current.topics, [activeTopic.id]: { ...(current.topics[activeTopic.id] ?? blankProgress()), ...next } } }));
  }
  function chooseTopic(topic: Topic) {
    setStore((current) => ({ ...current, activeTopic: topic.id }));
  }
  function goToStep(step: number) { updateProgress({ step }); }
  function returnToArticle() {
    setOpen(false);
    window.setTimeout(() => {
      const root = document.querySelector<HTMLElement>('[data-sc-reader]') ?? document.querySelector<HTMLElement>('.reader .prose');
      const frame = document.querySelector<HTMLElement>('.reader .html-document');
      const target = activeTopic.headingIndex === null ? document.getElementById('article-title') ?? root ?? frame : root?.querySelectorAll<HTMLElement>(':scope > :is(h1,h2,h3,h4,h5,h6)')[activeTopic.headingIndex] ?? frame;
      target?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }, 40);
  }
  function finishTopic() {
    updateProgress({ step: 4, completedAt: new Date().toISOString() });
  }
  function resetForNext() {
    const next = topics.find((topic) => !store.topics[topic.id]?.completedAt && topic.id !== activeTopic.id) ?? topics[0];
    setStore((current) => ({ ...current, activeTopic: next.id }));
  }

  const entryLabel = completed ? `继续学习 · ${completed}/${topics.length}` : '开始学习';
  return <>
    <section className={`feynman-entry feynman-${variant}`} aria-labelledby={`${titleId}-entry`}>
      <div className="feynman-entry-icon" aria-hidden="true"><Lightbulb /></div>
      <div><h2 id={`${titleId}-entry`}>把“读懂了”变成“讲得清”</h2><p>选一节，先不看原文讲一遍，再回来查漏、简化。</p></div>
      <button ref={openerRef} type="button" onClick={() => setOpen(true)}><BookOpenText aria-hidden="true" />{entryLabel}</button>
    </section>
    {open && <div className={`feynman-modal feynman-${variant} ux`} ref={dialogRef}>
      <button className="feynman-backdrop" type="button" onClick={() => setOpen(false)} aria-label="关闭学习模式" />
      <section className="feynman-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <header className="feynman-panel-head">
          <div><h2 id={titleId}>费曼学习</h2><p id={descriptionId}>不用照抄原文：讲给一个第一次接触这个主题的人听。</p></div>
          <button className="feynman-close" type="button" onClick={() => setOpen(false)} aria-label="关闭学习模式"><X /></button>
        </header>
        <ol className="feynman-steps u042-steps" aria-label="费曼学习步骤" style={{ '--p': ((currentStep - 1) / 3).toFixed(3) } as React.CSSProperties}>
          <li className="u042-line" aria-hidden="true"><i /></li>
          {stepLabels.map((label, index) => {
            const step = index + 1, done = step < currentStep, current = step === currentStep;
            return <li className={`u042-st${done ? ' done' : ''}${current ? ' cur' : ''}`} key={label}><button className="u042-dot" type="button" tabIndex={done ? 0 : -1} disabled={!done} onClick={() => done && goToStep(step)} aria-current={current ? 'step' : undefined} aria-label={`${label}${done ? '，已完成，可返回修改' : current ? '，当前步骤' : ''}`}><span>{step}</span><Check aria-hidden="true" /></button><small>{label}</small></li>;
          })}
        </ol>
        <div className="feynman-panel-body" aria-live="polite">
          {currentStep === 1 && <section className="feynman-pane"><div className="feynman-pane-title"><span>01</span><div><h3>这次要讲清哪一节？</h3><p>范围越小，越容易发现自己真正卡在哪里。</p></div></div><div className="feynman-topics" role="listbox" aria-label="选择学习主题">{topics.map((topic) => {
            const topicProgress = store.topics[topic.id];
            return <button type="button" role="option" aria-selected={topic.id === activeTopic.id} className={topic.id === activeTopic.id ? 'is-selected' : ''} onClick={() => chooseTopic(topic)} key={topic.id}><span><b>{topic.label}</b><small>{topicProgress?.completedAt ? '已完成一轮' : topicProgress?.explanation ? '有未完成记录' : topic.headingIndex === null ? '先建立整篇框架' : '按章节练习'}</small></span>{topicProgress?.completedAt && <Check aria-label="已完成" />}</button>;
          })}</div></section>}
          {currentStep === 2 && <section className="feynman-pane"><div className="feynman-pane-title"><span>02</span><div><h3>合上原文，讲给小白听</h3><p>当前主题：{activeTopic.label}</p></div></div><TextArea label="我的讲解" value={progress.explanation} onChange={(explanation) => updateProgress({ explanation, completedAt: undefined })} placeholder="它是什么？为什么重要？它是怎么运作的？试着举一个具体例子。" hint="至少写 20 字。不要复制定义，尽量只用日常语言。" minLength={20} /></section>}
          {currentStep === 3 && <section className="feynman-pane"><div className="feynman-pane-title"><span>03</span><div><h3>找出讲不下去的地方</h3><p>卡壳、绕圈和只能复述术语的地方，就是要回原文补的缺口。</p></div></div><TextArea label="我还讲不清" value={progress.gaps} onChange={(gaps) => updateProgress({ gaps, completedAt: undefined })} placeholder="例如：我能说出结论，但解释不了为什么；这个术语还需要借助另一个术语。" hint="至少写 8 字，记下一处缺口，再回原文找答案。" minLength={8} /><button className="feynman-review" type="button" onClick={returnToArticle}><Search aria-hidden="true" /><span><b>回原文查漏</b><small>保留当前记录，并定位到所选章节</small></span><ArrowRight aria-hidden="true" /></button></section>}
          {currentStep === 4 && <section className="feynman-pane"><div className="feynman-pane-title"><span>04</span><div><h3>删掉术语，再讲简单一点</h3><p>用一句话、一个类比或一个例子，把补过的缺口重新讲通。</p></div></div><TextArea label="最后的简单讲法" value={progress.simple} onChange={(simple) => updateProgress({ simple, completedAt: undefined })} placeholder="如果只能留下一句话，我会这样解释……" hint="至少写 12 字。目标不是短，而是不借助原文也能让人听懂。" minLength={12} /><fieldset className="feynman-confidence"><legend>现在能讲到什么程度？</legend>{confidenceOptions.map((option) => <button type="button" aria-pressed={progress.confidence === option.value} onClick={() => updateProgress({ confidence: option.value, completedAt: undefined })} key={option.value}><span>{option.label}</span><small>{option.detail}</small></button>)}</fieldset>{progress.completedAt && <div className="feynman-success" role="status"><Check aria-hidden="true" /><div><b>这一节已经完成一轮</b><span>下次仍可以回来修改、再讲一遍。</span></div></div>}</section>}
        </div>
        <footer className="feynman-panel-foot">
          <span className="feynman-save-state">{storageAvailable ? '记录仅保存在当前浏览器' : '当前浏览器无法持久保存；本轮仍可继续'}</span>
          {currentStep > 1 && <button className="feynman-secondary" type="button" onClick={() => goToStep(currentStep - 1)}><ArrowLeft aria-hidden="true" />上一步</button>}
          {currentStep === 1 && <button className="feynman-primary" type="button" onClick={() => goToStep(2)}>开始讲解<ArrowRight aria-hidden="true" /></button>}
          {currentStep === 2 && <button className="feynman-primary" type="button" disabled={Array.from(progress.explanation.trim()).length < 20} onClick={() => goToStep(3)}>找知识缺口<ArrowRight aria-hidden="true" /></button>}
          {currentStep === 3 && <button className="feynman-primary" type="button" disabled={Array.from(progress.gaps.trim()).length < 8} onClick={() => goToStep(4)}>已经查完<ArrowRight aria-hidden="true" /></button>}
          {currentStep === 4 && !progress.completedAt && <button className="feynman-primary" type="button" disabled={Array.from(progress.simple.trim()).length < 12 || !progress.confidence} onClick={finishTopic}>完成这一节<Check aria-hidden="true" /></button>}
          {currentStep === 4 && progress.completedAt && <button className="feynman-primary" type="button" onClick={resetForNext}>再学一节<ArrowRight aria-hidden="true" /></button>}
        </footer>
      </section>
    </div>}
  </>;
}
