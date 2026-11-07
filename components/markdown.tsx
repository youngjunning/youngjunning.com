import { allowsArticleEmbed } from '@/lib/site-profile.mjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createElement, Fragment } from 'react';
import type { Components } from 'react-markdown';
import { markdownUrlTransform } from '@/lib/markdown-url.mjs';
import { markdownRehypePlugins } from '@/lib/markdown-plugins.mjs';
import CodeBlock from '@/components/lucian/code-block';
import TermPreview from '@/components/lucian/term-preview';
import type { GlossaryEntry } from '@/lib/article-glossary';

const headings = Object.fromEntries(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((tag) => [tag,
  ({ id, children }: { id?: string; children?: React.ReactNode }) => createElement(tag, { id },
    id && !id.startsWith('user-content-') && <span id={`user-content-${id}`} className="heading-legacy-anchor" aria-hidden="true" />,
    id && <a className="heading-anchor" href={`#${encodeURIComponent(id)}`} aria-label="此章节的永久链接"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 .1l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7-.1l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7" /></svg></a>,
    <span className="article-heading-text u373-a u373-5">{children}</span>),
])) as Components;

function codeText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  if ('value' in node && typeof node.value === 'string') return node.value;
  if ('children' in node && Array.isArray(node.children)) return node.children.map(codeText).join('');
  return '';
}

export default function Markdown({ content, urls, title, glossary = [], unavailableAssets = [] }: { content: string; urls: Record<string, string>; title: string; glossary?: GlossaryEntry[]; unavailableAssets?: string[] }) {
  const withoutTitle = content.replace(new RegExp('^# ' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\n'), '');
  const terms = [...glossary].sort((a, b) => b.term.length - a.term.length);
  const pattern = terms.length ? new RegExp(terms.map(item => item.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g') : null;
  const annotate = (value: React.ReactNode): React.ReactNode => {
    if (typeof value !== 'string' || !pattern) return value;
    const result: React.ReactNode[] = [];
    let end = 0;
    for (const match of value.matchAll(pattern)) {
      const start = match.index;
      const before = value[start - 1] || '';
      const after = value[start + match[0].length] || '';
      if (/^[A-Za-z0-9]$/.test(match[0][0]) && (/[A-Za-z0-9]/.test(before) || /[A-Za-z0-9]/.test(after))) continue;
      const entry = terms.find(item => item.term === match[0]);
      if (!entry) continue;
      result.push(value.slice(end, start), <TermPreview key={`${entry.favoriteId}-${start}`} entry={entry} />);
      end = start + match[0].length;
    }
    result.push(value.slice(end));
    return result;
  };
  return <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={markdownRehypePlugins} urlTransform={markdownUrlTransform(urls)} components={{
    ...headings,
    pre: ({ children, node }) => {
      const code = node?.children.find((child) => child.type === 'element' && child.tagName === 'code');
      const classes = code?.type === 'element' ? code.properties.className : [];
      const language = Array.isArray(classes) ? classes.map(String).find((value) => value.startsWith('language-'))?.slice(9) : undefined;
      const labels: Record<string, string> = { ts: 'TypeScript', typescript: 'TypeScript', js: 'JavaScript', javascript: 'JavaScript', bash: 'Bash', sh: 'Shell', json: 'JSON', html: 'HTML', css: 'CSS', yaml: 'YAML', py: 'Python', python: 'Python', text: '纯文本', txt: '纯文本', plaintext: '纯文本' };
      const source = codeText(code).replace(/\r\n?/g, '\n').replace(/\n$/, '');
      const lineCount = source ? source.split('\n').length : 1;
      return <CodeBlock language={language ? labels[language] || language : '纯文本'} lineCount={lineCount}>{children}</CodeBlock>;
    },
    // Source images retain their intrinsic ratio; avoid requiring host-wide image allowlists.
    // eslint-disable-next-line @next/next/no-img-element
    img: ({ src, alt, ...props }) => typeof src === 'string' && unavailableAssets.some(original => (urls[original] || original) === src) ? <span className="source-note">原图暂不可用：<a href={src} target="_blank" rel="noreferrer">{alt || '查看原始图片链接'}</a></span> : <img {...props} src={typeof src === 'string' ? src : undefined} alt={alt || ''} loading="lazy" />,
    iframe: ({ src, title }) => allowsArticleEmbed(src)
      ? <iframe src={src} title={typeof title === 'string' ? title : '交互式流程图'} loading="lazy" sandbox="allow-scripts" referrerPolicy="no-referrer" style={{ display: 'block', width: '100%', height: '680px', border: 0, borderRadius: '8px' }} />
      : null,
    a: ({ href, children }) => <a href={href} {...(href?.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{children}</a>,
    p: ({ children }) => <p>{Array.isArray(children) ? children.map((child, index) => <Fragment key={index}>{annotate(child)}</Fragment>) : annotate(children)}</p>,
  }}>{withoutTitle}</ReactMarkdown>;
}
