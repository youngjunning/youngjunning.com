'use client';
import { useEffect, useState } from 'react';
export default function PaperReaderTools({ content }: { content: string }) {
  const [copied, setCopied] = useState('');
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);
  useEffect(() => {
    const reader = document.querySelector('[data-sc-reader]');
    function collect() {
      setHeadings(Array.from(reader?.querySelectorAll<HTMLElement>('h2[id],h3[id]') || []).map(node => ({ id: node.id, text: node.textContent?.replace(/ #$/, '') || '' })));
    }
    const frame = requestAnimationFrame(collect);
    function receive(event: MessageEvent) {
      const iframe = reader?.querySelector<HTMLIFrameElement>('iframe.html-document');
      if (!iframe || event.source !== iframe.contentWindow || event.data?.type !== 'article:headings' || !Array.isArray(event.data.headings)) return;
      const values = event.data.headings.filter((value: { id?: unknown; text?: unknown; level?: number }) => typeof value.id === 'string' && typeof value.text === 'string' && (value.level === 2 || value.level === 3)).map((value: { id: string; text: string }) => ({ id: value.id, text: value.text }));
      setHeadings(current => JSON.stringify(current) === JSON.stringify(values) ? current : values);
    }
    window.addEventListener('message', receive);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('message', receive); };
  }, [content]);
  async function copy() { try { await navigator.clipboard.writeText(content); setCopied('已复制'); } catch { setCopied('复制失败，请使用原文链接'); } }
  return <div className="sc-reader-tools"><button type="button" onClick={copy}>复制正文</button><span role="status">{copied}</span>{headings.length > 0 && <details><summary>文章目录 · {headings.length} 节</summary><nav aria-label="文章目录">{headings.map(heading => <a key={heading.id} href={`#${encodeURIComponent(heading.id)}`}>{heading.text}</a>)}</nav></details>}</div>;
}
