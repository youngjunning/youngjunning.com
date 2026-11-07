// Lucian UX/UI Prompt #061 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#061
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import './image-preview.css';

type Photo = { src: string; alt: string; rect?: DOMRect };

export default function ImagePreview() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const root = dialogRef.current!;
    const view = root.querySelector<HTMLElement>('.u061-view')!;
    const img = root.querySelector<HTMLElement>('.u061-img')!;
    const photo = root.querySelector<HTMLImageElement>('.u061-photo')!;
    const closeButton = root.querySelector<HTMLButtonElement>('.u061-close')!;
    const zoomButton = root.querySelector<HTMLButtonElement>('.u061-toggle')!;
    const caption = root.querySelector<HTMLElement>('.u061-cap b')!;
    const hint = root.querySelector<HTMLElement>('.u061-cap small')!;
    const count = root.querySelector<HTMLElement>('.u061-cap em')!;
    const zoomLabel = root.querySelector<HTMLElement>('.u061-zoom')!;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const enhanced = new Map<HTMLImageElement, { role: string | null; tabIndex: string | null; label: string | null }>();
    let photos: Photo[] = [], current = 0, z = 1, tx = 0, ty = 0;
    let sx = 0, sy = 0, ox = 0, oy = 0, mode = '';
    let previousFocus: HTMLElement | null = null;
    let previousOverflow = '', closing = false, dragged = false;
    let animation: Animation | undefined;

    function eligible(image: HTMLImageElement) {
      if (!image.closest('main') || image.closest('[data-no-image-preview],button,[role="button"],.u061')) return false;
      const link = image.closest('a');
      return !link || link.href === image.src || /\.(png|jpe?g|webp|gif|svg|avif)([?#]|$)/i.test(link.href);
    }
    function scan() {
      document.querySelectorAll<HTMLImageElement>('main img').forEach((image) => {
        if (enhanced.has(image) || !eligible(image)) return;
        enhanced.set(image, { role: image.getAttribute('role'), tabIndex: image.getAttribute('tabindex'), label: image.getAttribute('aria-label') });
        image.dataset.imagePreview = '';
        image.setAttribute('role', 'button'); image.tabIndex = 0;
        image.setAttribute('aria-label', `预览图片：${image.alt || '查看大图'}`);
      });
    }
    function transform() { img.style.transform = `translate(${tx}px,${ty}px) scale(${z})`; }
    function setZoom(nz: number, x = view.clientWidth / 2, y = view.clientHeight / 2) {
      if (nz > 1) {
        tx = Math.min(0, Math.max(view.clientWidth * (1 - nz), x - (x - tx) * nz / z));
        ty = Math.min(0, Math.max(view.clientHeight * (1 - nz), y - (y - ty) * nz / z));
      } else { tx = 0; ty = 0; }
      z = nz; transform(); root.classList.toggle('is-zoom', z > 1);
      zoomLabel.textContent = `${Math.round(z * 100)}%`;
      zoomButton.setAttribute('aria-label', z > 1 ? '恢复适应屏幕' : '放大图片');
    }
    function show() {
      const item = photos[current];
      hint.textContent = '图片加载中…';
      photo.src = item.src; photo.alt = item.alt;
      caption.textContent = item.alt || '图片预览'; count.textContent = `${current + 1} / ${photos.length}`;
      root.querySelectorAll<HTMLButtonElement>('.u061-prev,.u061-next').forEach((button) => { button.hidden = photos.length < 2; });
      img.classList.remove('now'); setZoom(1);
    }
    function morph(rect: DOMRect | undefined, reverse = false) {
      animation?.cancel();
      if (!rect || reducedMotion.matches || rect.bottom < 0 || rect.top > window.innerHeight) return;
      const thumb = { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: '18px' };
      const full = { left: '0px', top: '0px', width: `${root.clientWidth}px`, height: `${root.clientHeight}px`, borderRadius: '0px' };
      animation = view.animate(reverse ? [full, thumb] : [thumb, full], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
      return animation;
    }
    function open(items: Photo[], index: number, focus: HTMLElement | null) {
      if (root.open || !items.length) return;
      photos = items; current = index; previousFocus = focus;
      previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
      root.showModal(); root.classList.add('is-open', 'is-ready'); show(); morph(photos[current].rect);
      closeButton.focus({ preventScroll: true });
    }
    function finishClose() {
      root.close(); root.classList.remove('is-open', 'is-ready', 'is-zoom');
      view.style.transform = ''; root.style.removeProperty('--so');
      document.body.style.overflow = previousOverflow; closing = false;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    }
    function close() {
      if (!root.open || closing) return;
      closing = true; root.classList.remove('is-ready'); setZoom(1);
      const exit = morph(photos[current].rect, true);
      if (exit) exit.onfinish = finishClose; else finishClose();
    }
    function go(delta: number) {
      if (closing) return;
      current = (current + delta + photos.length) % photos.length; show();
      if (!reducedMotion.matches) img.animate([{ transform: `translateX(${delta * 40}px)`, opacity: .2 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    function activate(image: HTMLImageElement) {
      const scope = image.closest('article') || image.closest('main')!;
      const images = [...scope.querySelectorAll<HTMLImageElement>('img[data-image-preview]')].filter((item) => item.currentSrc || item.src);
      const index = images.indexOf(image);
      if (index >= 0) open(images.map((item) => ({ src: item.currentSrc || item.src, alt: item.alt, rect: item.getBoundingClientRect() })), index, image);
    }
    function click(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.target instanceof HTMLImageElement && event.target.hasAttribute('data-image-preview')) { event.preventDefault(); activate(event.target); }
    }
    function key(event: KeyboardEvent) {
      if (!root.open) {
        if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLImageElement && event.target.hasAttribute('data-image-preview')) { event.preventDefault(); activate(event.target); }
        return;
      }
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); go(1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); }
      else if (event.key === 'Tab') {
        event.preventDefault();
        const buttons = [...root.querySelectorAll<HTMLButtonElement>('button:not([hidden])')];
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus({ preventScroll: true });
      }
    }
    function message(event: MessageEvent) {
      const frame = [...document.querySelectorAll<HTMLIFrameElement>('iframe.html-document')].find((item) => item.contentWindow === event.source);
      const data = event.data;
      if (!frame || data?.type !== 'article:images' || !Array.isArray(data.images) || !Number.isInteger(data.index) || data.index < 0 || data.index >= data.images.length) return;
      const items: Photo[] = [];
      for (const item of data.images) {
        if (!item || typeof item.src !== 'string' || typeof item.alt !== 'string') return;
        try { if (!['http:', 'https:'].includes(new URL(item.src).protocol)) return; } catch { return; }
        items.push({ src: item.src, alt: item.alt });
      }
      open(items, data.index, frame);
    }
    function viewClick(event: MouseEvent) {
      if (dragged) { dragged = false; return; }
      if (event.target === view || event.target === img) close();
    }
    function doubleClick(event: MouseEvent) {
      if ((event.target as Element).closest('button')) return;
      img.classList.remove('now'); setZoom(z > 1 ? 1 : 2, event.clientX, event.clientY);
    }
    function wheel(event: WheelEvent) {
      event.preventDefault(); img.classList.add('now');
      setZoom(Math.max(1, Math.min(3, z * (event.deltaY < 0 ? 1.12 : .89))), event.clientX, event.clientY);
    }
    function down(event: PointerEvent) {
      if ((event.target as Element).closest('button') || closing) return;
      sx = event.clientX; sy = event.clientY; ox = tx; oy = ty; mode = 'wait'; dragged = false;
    }
    function move(event: PointerEvent) {
      if (!mode) return;
      const dx = event.clientX - sx, dy = event.clientY - sy;
      if (mode === 'wait' && Math.hypot(dx, dy) > 6) {
        mode = z > 1 ? 'pan' : Math.abs(dy) > Math.abs(dx) ? 'down' : 'side';
        view.setPointerCapture(event.pointerId); dragged = true;
      }
      if (mode === 'pan') {
        img.classList.add('now'); tx = Math.min(0, Math.max(view.clientWidth * (1 - z), ox + dx)); ty = Math.min(0, Math.max(view.clientHeight * (1 - z), oy + dy)); transform();
      } else if (mode === 'down') {
        const distance = Math.max(0, dy);
        view.style.transform = `translateY(${distance}px) scale(${1 - distance / 1600})`; root.style.setProperty('--so', String(Math.max(.2, 1 - distance / 300)));
      } else if (mode === 'side') { img.classList.add('now'); img.style.transform = `translateX(${dx * .5}px)`; }
    }
    function up(event: PointerEvent) {
      const lastMode = mode; mode = ''; img.classList.remove('now'); view.style.transform = ''; root.style.removeProperty('--so');
      if (event.type !== 'pointercancel' && lastMode === 'down' && event.clientY - sy > 110) close();
      else if (event.type !== 'pointercancel' && lastMode === 'side' && Math.abs(event.clientX - sx) > 70) go(event.clientX < sx ? 1 : -1);
      else transform();
    }
    function cancel(event: Event) { event.preventDefault(); close(); }
    function controls(event: MouseEvent) {
      if (event.target === root) { close(); return; }
      const button = (event.target as Element).closest('button');
      if (button?.classList.contains('u061-close')) close();
      else if (button?.classList.contains('u061-prev')) go(-1);
      else if (button?.classList.contains('u061-next')) go(1);
      else if (button?.classList.contains('u061-toggle')) { img.classList.remove('now'); setZoom(z > 1 ? 1 : 2); }
    }
    function resize() { if (root.open) setZoom(1); }
    function loaded() { hint.textContent = '双击或滚轮缩放 · 拖动查看 · ← → 切图 · Esc 关闭'; }
    function failed() { hint.textContent = '图片加载失败，请关闭后重试'; }
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
    document.addEventListener('click', click); document.addEventListener('keydown', key);
    window.addEventListener('message', message); window.addEventListener('resize', resize);
    root.addEventListener('cancel', cancel); root.addEventListener('click', controls);
    root.addEventListener('wheel', wheel, { passive: false });
    photo.addEventListener('load', loaded); photo.addEventListener('error', failed);
    view.addEventListener('click', viewClick); view.addEventListener('dblclick', doubleClick);
    view.addEventListener('pointerdown', down); view.addEventListener('pointermove', move); view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
    return () => {
      observer.disconnect(); animation?.cancel();
      document.removeEventListener('click', click); document.removeEventListener('keydown', key); window.removeEventListener('message', message); window.removeEventListener('resize', resize);
      root.removeEventListener('cancel', cancel); root.removeEventListener('click', controls);
      root.removeEventListener('wheel', wheel);
      photo.removeEventListener('load', loaded); photo.removeEventListener('error', failed);
      view.removeEventListener('click', viewClick); view.removeEventListener('dblclick', doubleClick);
      view.removeEventListener('pointerdown', down); view.removeEventListener('pointermove', move); view.removeEventListener('pointerup', up); view.removeEventListener('pointercancel', up);
      if (root.open) { root.close(); document.body.style.overflow = previousOverflow; }
      enhanced.forEach((attributes, image) => {
        delete image.dataset.imagePreview;
        for (const [name, value] of Object.entries({ role: attributes.role, tabindex: attributes.tabIndex, 'aria-label': attributes.label })) {
          if (value === null) image.removeAttribute(name); else image.setAttribute(name, value);
        }
      });
    };
  }, [pathname]);

  return <dialog ref={dialogRef} className="ux u061" aria-label="图片预览">
    <div className="u061-scrim" aria-hidden="true" />
    <div className="u061-view">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div className="u061-img"><img className="u061-photo" alt="" draggable={false} /></div>
      <div className="u061-ui">
        <span className="u061-zoom">100%</span>
        <button className="u061-x u061-toggle" type="button" aria-label="放大图片"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5M7 10h6M10 7v6" /></svg></button>
        <button className="u061-x u061-close" type="button" aria-label="关闭图片预览"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        <button className="u061-x u061-prev" type="button" aria-label="上一张图片"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg></button>
        <button className="u061-x u061-next" type="button" aria-label="下一张图片"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg></button>
        <div className="u061-cap" aria-live="polite"><span><small>双击或滚轮缩放 · 拖动查看 · ← → 切图 · Esc 关闭</small><b /></span><em /></div>
      </div>
    </div>
  </dialog>;
}
