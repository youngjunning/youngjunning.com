'use client';

import { useEffect, useRef, useState } from 'react';
import { articleNoticeMarkdown } from '@/lib/article-notice';

export default function CopyMarkdown({ title, body, id }: { title: string; body: string; id: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    const markdown = `# ${title}\n\n${body.trim()}\n\n${articleNoticeMarkdown('俊宁', `https://youngjunning.com/blog/${id}`)}\n`;
    try {
      await navigator.clipboard.writeText(markdown);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    timer.current = setTimeout(() => setStatus('idle'), 2500);
  }
  return <div className="article-copy"><button type="button" onClick={copy}>复制 Markdown</button><span role="status">{status === 'copied' ? '已复制，含版权声明' : status === 'failed' ? '复制失败，请检查浏览器权限' : ''}</span></div>;
}
