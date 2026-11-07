// Lucian UX/UI Prompt #058 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#058
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { canTrackVisits, requestSiteVisits } from '@/lib/site-visits.mjs';
import './article-reading-stats.css';
import './site-visit-stats.css';

type Counts = { sitePv: number; siteUv: number };

function VisitCounts() {
  const [result, setResult] = useState<Counts | 'disabled' | null>();
  useEffect(() => {
    let cancel: (() => void) | undefined;
    // Defer until after mount; StrictMode's discarded effect never sends a visit.
    const timer = window.setTimeout(() => {
      if (!canTrackVisits(window.location.hostname, process.env.NODE_ENV === 'production')) {
        setResult('disabled');
        return;
      }
      cancel = requestSiteVisits(setResult);
    }, 0);
    return () => { window.clearTimeout(timer); cancel?.(); };
  }, []);

  return <span className="article-reading-stats site-visit-stats" role="status" title="Vercount 免费汇总统计；仅发送站点域名，通过本站 Cookie 区分新访客，不发送页面路径、查询参数或对话内容。">
    {result === 'disabled' ? <span>本地预览不计数</span> : result === null ? <span>访客统计暂不可用</span> : <>
      <span>总访客 <b>{result?.siteUv.toLocaleString('zh-CN') ?? '—'}</b></span>
      <span aria-hidden="true">·</span>
      <span>总访问 <b>{result?.sitePv.toLocaleString('zh-CN') ?? '—'}</b></span>
    </>}
  </span>;
}

export default function SiteVisitStats() {
  const pathname = usePathname();
  // Count committed pathname changes, excluding search filters and article anchors.
  return <VisitCounts key={pathname} />;
}
