'use client';
/* eslint-disable @next/next/no-img-element -- The dialog displays original source images. */
import { useEffect, useRef, useState } from 'react';
type Picture = { src: string; alt: string };
function validSource(src: unknown): src is string {
  if (typeof src !== 'string') return false;
  try { return ['https:', 'http:'].includes(new URL(src, location.href).protocol); } catch { return false; }
}
export default function PaperImageViewer() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    function show(images: Picture[], position: number) {
      if (!images.length || !Number.isInteger(position) || !images[position]) return;
      trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPictures(images); setIndex(position); dialog.current?.showModal();
    }
    function click(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || !(event.target instanceof Element) || !event.target.closest('[data-sc-reader]') || event.target.closest('a')) return;
      const target = event.target instanceof HTMLImageElement ? event.target : event.target.closest('.sc-image-trigger')?.querySelector('img');
      if (!target) return;
      const images = Array.from(document.querySelectorAll<HTMLImageElement>('[data-sc-reader] img')).filter(image => validSource(image.currentSrc || image.src));
      const position = images.indexOf(target);
      if (position < 0) return;
      event.preventDefault(); show(images.map(image => ({ src: image.currentSrc || image.src, alt: image.alt })), position);
    }
    function receive(event: MessageEvent) {
      const iframe = document.querySelector<HTMLIFrameElement>('iframe.html-document');
      if (!iframe || event.source !== iframe.contentWindow || event.data?.type !== 'article:images' || !Array.isArray(event.data.images)) return;
      if (!event.data.images.every((image: Picture) => image && validSource(image.src) && typeof image.alt === 'string')) return;
      show(event.data.images, event.data.index);
    }
    document.addEventListener('click', click); window.addEventListener('message', receive);
    return () => { document.removeEventListener('click', click); window.removeEventListener('message', receive); };
  }, []);
  return <dialog aria-label="图片预览" className="sc-image-dialog" ref={dialog} onClose={() => trigger.current?.focus()} onClick={event => { if (event.target === dialog.current) dialog.current.close(); }} onKeyDown={event => { if (event.key === 'ArrowRight') setIndex(value => (value + 1) % pictures.length); if (event.key === 'ArrowLeft') setIndex(value => (value + pictures.length - 1) % pictures.length); }}><header><span>{index + 1} / {pictures.length}</span><button type="button" onClick={() => dialog.current?.close()} autoFocus>关闭 ×</button></header>{pictures[index] && <figure><img src={pictures[index].src} alt={pictures[index].alt} /><figcaption>{pictures[index].alt}</figcaption></figure>}<footer><button type="button" disabled={pictures.length < 2} onClick={() => setIndex(value => (value + pictures.length - 1) % pictures.length)}>← 上一张</button>{pictures[index] && <a href={pictures[index].src} target="_blank" rel="noreferrer">打开原图 ↗</a>}<button type="button" disabled={pictures.length < 2} onClick={() => setIndex(value => (value + 1) % pictures.length)}>下一张 →</button></footer></dialog>;
}
