import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import { fromHtml } from 'hast-util-from-html';
const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw);
const decode = value => { try { return decodeURI(value); } catch { return value; } };

/** Retain the public site's existing local media and legacy article destinations. */
export function publicArticleUrlMap(post, posts, aliases = {}) {
  const urls = { ...(post.assets || {}) };
  const ids = new Set(posts.map(item => item.id));
  const files = new Map(posts.map(item => [item.file, '/blog/' + item.id]));
  function transform(url, image = false) {
    const decoded = decode(url);
    if (post.assets?.[url] || post.assets?.[decoded]) return post.assets[url] || post.assets[decoded];
    if (image) return url.startsWith('/images/') ? 'https://blog.zisheng.pro' + url : url;
    if (/^github\.com\//.test(url)) return 'https://' + url;
    const nested = url.match(/^\[(https:\/\/[^\]]+)\]\(https:\/\/[^)]+\)$/);
    if (nested) return nested[1];
    if (url.startsWith('#')) return url;
    if (url.startsWith('/posts/') || /^https?:\/\/blog\.zisheng\.pro\/posts\//.test(url)) {
      const old = new URL(url, 'https://blog.zisheng.pro');
      const destination = aliases[old.pathname.replace(/\/$/, '') + '/'];
      if (destination) return destination + old.hash;
    }
    const stable = url.match(/^\/(?:docs|blog)\/([a-f0-9]{16})(?:#(.*))?$/);
    if (stable && ids.has(stable[1])) return '/blog/' + stable[1] + (stable[2] ? '#' + stable[2] : '');
    if (!/^(?:[a-z][\w+.-]*:|\/\/)/i.test(url)) {
      const filename = decode(url.split(/[?#]/)[0].split('/').at(-1) || '');
      if (files.has(filename)) return files.get(filename) + (url.includes('#') ? '#' + url.split('#').slice(1).join('#') : '');
    }
    return url;
  }
  function visit(node) {
    if (node.type === 'element') {
      for (const attribute of ['src', 'href']) {
        const url = node.properties?.[attribute];
        if (typeof url === 'string') urls[url] = transform(url, attribute === 'src');
      }
    }
    for (const child of node.children || []) visit(child);
  }
  visit(post.kind === 'html' ? fromHtml(post.body, { fragment: true }) : processor.runSync(processor.parse(post.body)));
  return urls;
}
