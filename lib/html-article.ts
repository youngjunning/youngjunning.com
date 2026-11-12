import { siteProfile } from './site-profile.mjs';

// Keep the source document isolated while making it part of the page's reading flow.
// Scrollbar policy from Lucian UX/UI Prompt #260 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#260
// Mirror globals.css here because isolated HTML articles do not inherit the site's CSS.
// Image activation from Lucian UX/UI Prompt #061 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#061
export function renderHtmlArticle(html: string, title: string, id: string) {
  const bridge = `<style>*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}html,body{background:transparent!important}html{overflow-y:hidden}body{margin:0!important;min-height:0!important;display:flow-root}.heading-anchor{display:inline-block;margin-left:.45em;font-size:.75em;font-weight:500;color:inherit;opacity:.5;text-decoration:none}.heading-anchor:focus-visible,.heading-anchor:hover{opacity:1}</style><script>
(() => {
  const normalize = (value) => value.replace(/\\s+/g, '');
  const heading = document.querySelector('h1');
  if (heading && normalize(heading.textContent) === normalize(${JSON.stringify(title).replace(/</g, '\\u003c')})) heading.hidden = true;
  const articlePath = ${JSON.stringify(siteProfile.articlePath + '/')} + ${JSON.stringify(id)};
  const used = new Set([...document.querySelectorAll('[id]')].map((node) => node.id));
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((node) => !node.hidden);
  const labels = new Map();
  const images = [...document.querySelectorAll('img')].filter((image) => {
    if (image.closest('[data-no-image-preview],button,[role="button"]')) return false;
    const link = image.closest('a');
    return !link || link.href === image.src || /\\.(png|jpe?g|webp|gif|svg|avif)([?#]|$)/i.test(link.href);
  });
  const imageStyle = document.createElement('style');
  imageStyle.textContent = 'img[data-image-preview]{cursor:zoom-in}img[data-image-preview]:focus-visible{outline:2px solid currentColor;outline-offset:3px}';
  document.head.append(imageStyle);
  const themeStyle = document.createElement('style');
  themeStyle.textContent = 'html[data-style="statechart"] body{font-family:"Kaiti SC",KaiTi,"STKaiti","Songti SC",serif!important;color:#21201f!important}html[data-style="statechart"] :is(section,article,div,header,aside){background-color:#faf9f6!important;background-image:none!important;box-shadow:none!important;border-radius:0!important;border-color:#dcd8d0!important;color:#21201f!important}html[data-style="statechart"] :is(h1,h2,h3,h4,p,li,span){color:#21201f!important}html[data-style="statechart"] a{color:#933323!important}html[data-style="statechart"] :is(pre,code){background:#f2efe8!important;color:#21201f!important}';
  themeStyle.textContent += 'html[data-style="xiaoxiang"] body{font-family:Inter,-apple-system,"PingFang SC",sans-serif!important;color:#28252a!important}html[data-style="xiaoxiang"] :is(section,article,div,header,aside){background-color:#fffefa!important;border-color:#c9bfc0!important;color:#28252a!important}html[data-style="xiaoxiang"] :is(h1,h2,h3,h4){font-family:Georgia,"Songti SC",serif!important;color:#28252a!important}html[data-style="xiaoxiang"] a{color:#6d354d!important}html[data-style="xiaoxiang"] :is(pre,code){background:#f3edea!important;color:#28252a!important}';
  document.head.append(themeStyle);
  images.forEach((image) => {
    image.dataset.imagePreview = '';
    image.setAttribute('role', 'button');
    image.tabIndex = 0;
    image.setAttribute('aria-label', '预览图片：' + (image.alt || '查看大图'));
  });
  const previewImage = (image) => {
    const index = images.indexOf(image);
    if (index < 0) return false;
    parent.postMessage({ type: 'article:images', index, images: images.map((item) => ({ src: item.currentSrc || item.src, alt: item.alt })) }, '*');
    return true;
  };
  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || !['Enter', ' '].includes(event.key) || !images.includes(event.target)) return;
    event.preventDefault();
    previewImage(event.target);
  });
  headings.forEach((node) => {
    const text = node.textContent.trim();
    labels.set(node, text);
    if (!node.id) {
      const base = text.toLowerCase().trim().replace(/[^\\p{L}\\p{N}\\s_-]/gu, '').replace(/\\s/g, '-') || 'section';
      let candidate = base, suffix = 0;
      while (used.has(candidate)) candidate = base + '-' + (++suffix);
      node.id = candidate;
      used.add(candidate);
    }
    const link = document.createElement('a');
    link.className = 'heading-anchor';
    link.href = articlePath + '#' + encodeURIComponent(node.id);
    link.setAttribute('aria-label', '此章节的永久链接');
    link.textContent = ' #';
    node.append(link);
  });
  const jump = (hash) => {
    let target;
    try { target = document.getElementById(decodeURIComponent(hash.replace(/^#/, ''))); } catch { return; }
    if (target) parent.postMessage({ type: 'article:anchor', id: target.id, top: target.getBoundingClientRect().top + window.scrollY }, '*');
  };
  let previousHeight = 0;
  const measure = () => {
    const height = Math.ceil(document.body.getBoundingClientRect().height);
    if (height > 0 && height !== previousHeight) {
      previousHeight = height;
      parent.postMessage({ type: 'article:resize', height }, '*');
    }
    parent.postMessage({ type: 'article:headings', headings: headings.map((node) => ({ id: node.id, text: labels.get(node), level: Number(node.tagName.slice(1)), top: node.getBoundingClientRect().top + window.scrollY, height: node.getBoundingClientRect().height })) }, '*');
  };
  new ResizeObserver(measure).observe(document.body);
  window.addEventListener('load', measure);
  window.addEventListener('message', (event) => {
    if (event.source === parent && event.data?.type === 'article:theme') {
      document.documentElement.dataset.style = ['statechart', 'xiaoxiang'].includes(event.data.style) ? event.data.style : '';
      requestAnimationFrame(measure);
    }
    if (event.source === parent && event.data?.type === 'article:navigate' && typeof event.data.hash === 'string') jump(event.data.hash);
    if (event.source === parent && event.data?.type === 'article:measure') {
      previousHeight = 0;
      measure();
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && previewImage(event.target)) {
      event.preventDefault();
      return;
    }
    const link = event.target.closest?.('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!link.hash || link.origin !== location.origin || ![location.pathname, articlePath].includes(link.pathname) || link.search) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(link.hash.slice(1))); } catch { return; }
    if (!target) return;
    event.preventDefault();
    jump(link.hash);
  });
  measure();
})();
</script>`;
  return /<\/body\s*>/i.test(html) ? html.replace(/<\/body\s*>/i, `${bridge}</body>`) : `${html}${bridge}`;
}
