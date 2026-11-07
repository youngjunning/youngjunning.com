'use client';

import { siteProfile } from '@/lib/site-profile.mjs';
import { useEffect, useRef, useState } from 'react';
import { articleNoticeMarkdown } from '@/lib/article-notice';
import { articleBodyForCopy } from '@/lib/article-copy.mjs';

function legacyCopy(text: string) {
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

export default function CopyMarkdown({ text, articleId, label = '复制 Markdown', title = '复制 Markdown 正文和转载说明', success = 'Markdown 已复制', failure = '复制失败，请打开原文后复制' }: { text: string; articleId?: string; label?: string; title?: string; success?: string; failure?: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    setBusy(true);
    try {
      const body = articleBodyForCopy(text);
      const copyText = articleId ? `${body}\n\n${articleNoticeMarkdown(siteProfile.name, new URL(`${siteProfile.articlePath}/${articleId}`, window.location.origin).href)}\n` : body;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(copyText);
      } catch { legacyCopy(copyText); }
      setStatus('copied');
      timer.current = setTimeout(() => setStatus('idle'), 2500);
    } catch { setStatus('failed'); }
    finally { setBusy(false); }
  }
  return <span className="copy-markdown-control"><button type="button" className="copy-markdown-button" title={title} disabled={busy} onClick={copy}>{busy ? '复制中…' : status === 'copied' ? '已复制 ✓' : label}</button><span className={status === 'failed' ? 'copy-markdown-error' : 'copy-markdown-status'} role="status">{status === 'failed' ? failure : status === 'copied' ? success : ''}</span></span>;
}
