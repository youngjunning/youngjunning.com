// Lucian UX/UI Prompt #008 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#008
// Lucian UX/UI Prompt #288 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#288
'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import './code-block.css';

const PREVIEW_LINES = 12;

// Port #008's copy box and #288's fading expandable content to a code sample.
export default function CodeBlock({ language, lineCount, children }: { language: string; lineCount: number; children: ReactNode }) {
  const contentId = useId();
  const codeRef = useRef<HTMLPreElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [fullHeight, setFullHeight] = useState(0);
  const isLong = lineCount > PREVIEW_LINES;
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    const pre = codeRef.current;
    if (!pre || !isLong) return;
    const measure = () => setFullHeight(pre.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pre);
    return () => observer.disconnect();
  }, [children, isLong]);

  async function copy() {
    if (busy) return;
    const text = codeRef.current?.textContent;
    if (text == null) return;
    if (timer.current) clearTimeout(timer.current);
    setBusy(true);
    try {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(text);
      } catch {
        // Internal HTTP deployments also need a working copy action.
        const previous = document.activeElement;
        const field = document.createElement('textarea');
        field.value = text;
        field.readOnly = true;
        field.style.cssText = 'position:fixed;left:-10000px;top:0;';
        document.body.appendChild(field);
        try {
          field.select();
          if (!document.execCommand('copy')) throw new Error('Copy unavailable');
        } finally {
          field.remove();
          if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
        }
      }
      setStatus('copied');
    } catch { setStatus('failed'); }
    finally {
      setBusy(false);
      timer.current = setTimeout(() => setStatus('idle'), 1800);
    }
  }

  return <div className={`ux u008 u288 article-code${status === 'copied' ? ' is-copied' : ''}${status === 'failed' ? ' is-failed' : ''}${isLong ? ' has-overflow' : ''}${expanded ? ' is-open' : ''}${collapsed ? ' is-folded' : ''}`}>
    <div className="u008-box">
      <div className="article-code-toolbar">
        <span className="article-code-language">{language}</span>
        <span className="article-code-count">{lineCount} 行</span>
        <button className="article-code-toggle u288-mr" type="button" aria-controls={contentId} aria-expanded={!collapsed} aria-label={collapsed ? '展开代码' : '折叠代码'} title={collapsed ? '展开代码' : '折叠代码'} onClick={() => setCollapsed(value => !value)}>
          <span>{collapsed ? '展开' : '折叠'}</span>
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="article-code-copy">
          <button className="u008-btn" type="button" aria-label="复制代码" title="复制代码" aria-disabled={busy} aria-busy={busy} onClick={copy}>
            <svg className="u008-cp" viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" /></svg>
            <svg className="u008-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.5l4.2 4.2L18.5 8" /></svg>
          </button>
          <span className="u008-tip" role="status">{status === 'copied' ? '已复制' : status === 'failed' ? '复制失败，请手动选择代码' : ''}</span>
        </div>
      </div>
      <div id={contentId} hidden={collapsed} className={`article-code-content u288-dt${isLong && !expanded ? ' is-collapsed' : ''}`} style={isLong && expanded ? { height: fullHeight || 'auto' } : undefined}>
        <div className="article-code-lines" aria-hidden="true">{Array.from({ length: lineCount }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
        <pre ref={codeRef} className="u008-code" tabIndex={0} aria-label={`${language} 代码，共 ${lineCount} 行，可横向滚动`}>{children}</pre>
      </div>
      {isLong && !collapsed && <button className="article-code-expand u288-mr" type="button" aria-controls={contentId} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
        <span>{expanded ? '收起代码' : `展开全部 ${lineCount} 行`}</span>
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>}
    </div>
  </div>;
}
