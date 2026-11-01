import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import { fromHtml } from 'hast-util-from-html';

const markdown = unified().use(remarkParse).use(remarkGfm).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw);
export function embeddedArticleResources(body, kind = 'markdown') {
  const urls = new Set();
  const add = url => { if (typeof url === 'string' && url.trim() && !url.startsWith('#')) urls.add(url.trim()); };
  const css = text => {
    for (const match of text.matchAll(/\burl\(\s*["']?([^)'"\s]+)["']?\s*\)|@import\s+["']([^"']+)["']/gi)) add(match[1] || match[2]);
  };
  const visit = node => {
      if (node.type === 'element') {
        const p = node.properties || {};
        if (['img', 'script', 'audio', 'video', 'source', 'track', 'embed', 'iframe', 'input'].includes(node.tagName)) add(p.src);
        if (['image', 'use'].includes(node.tagName)) add(p.href || p.xLinkHref);
        if (node.tagName === 'object') add(p.data);
        if (node.tagName === 'link') add(p.href);
        add(p.poster);
        if (p.srcSet) for (const item of String(p.srcSet).split(/,\s+(?=\S)/)) add(item.trim().replace(/\s+[\d.]+[wx]$/, ''));
        if (typeof p.style === 'string') css(p.style);
        if (node.tagName === 'style') css((node.children || []).map(child => child.value || '').join(''));
      }
    for (const child of node.children || []) visit(child);
  };
  visit(kind === 'html' ? fromHtml(body, { fragment: true }) : markdown.runSync(markdown.parse(body)));
  return [...urls];
}
