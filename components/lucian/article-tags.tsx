// Lucian UX/UI Prompt #292 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#292
'use client';

import Link from 'next/link';
import { articleHref } from '@/lib/article-navigation.mjs';
import './article-tags.css';

export default function ArticleTags({ tags, onSelect }: { tags: string[]; onSelect?: (tag: string) => void }) {
  const unique = [...new Set(tags.filter(Boolean))];
  if (!unique.length) return null;
  return <div className="ux u292 article-tags" role="group" aria-label="文章标签">{unique.map((tag) => onSelect
    ? <button className="u292-f" type="button" key={tag} onClick={() => onSelect(tag)}>#{tag}</button>
    : <Link className="u292-f" key={tag} href={articleHref({ tag })}>#{tag}</Link>)}</div>;
}
