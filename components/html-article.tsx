'use client';

import { useEffect, useRef } from 'react';

export default function HtmlArticle({ id, title }: { id: string; title: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let initialNavigation = true;
    function theme() {
      frameRef.current?.contentWindow?.postMessage({ type: 'article:theme', style: document.documentElement.dataset.theme === 'statechart' ? 'statechart' : document.documentElement.dataset.style }, '*');
    }
    const observer = new MutationObserver(theme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-style', 'data-theme'] });
    function navigate() {
      if (window.location.hash && window.location.hash !== '#article-title') frameRef.current?.contentWindow?.postMessage({ type: 'article:navigate', hash: window.location.hash }, '*');
    }
    function receive(event: MessageEvent) {
      const frame = frameRef.current;
      if (!frame || event.source !== frame.contentWindow) return;
      const data = event.data;
      if (data?.type === 'article:resize' && Number.isFinite(data.height) && data.height > 0) {
        frame.style.height = `${Math.ceil(data.height)}px`;
        window.dispatchEvent(new Event('resize'));
      }
      if (data?.type === 'article:headings' && initialNavigation) {
        initialNavigation = false;
        theme();
        navigate();
      }
      if (data?.type === 'article:anchor' && Number.isFinite(data.top) && typeof data.id === 'string') {
        const hash = '#' + encodeURIComponent(data.id);
        if (window.location.hash !== hash) window.history.pushState(null, '', hash);
        window.scrollTo({ top: window.scrollY + frame.getBoundingClientRect().top + data.top - 130 });
      }
    }
    window.addEventListener('message', receive);
    window.addEventListener('hashchange', navigate);
    frameRef.current?.contentWindow?.postMessage({ type: 'article:measure' }, '*');
    return () => { observer.disconnect(); window.removeEventListener('message', receive); window.removeEventListener('hashchange', navigate); };
  }, [id]);

  return <iframe ref={frameRef} className="html-document" title={title} src={`/preview/${id}`} sandbox="allow-scripts" onLoad={() => frameRef.current?.contentWindow?.postMessage({ type: 'article:measure' }, '*')} />;
}
