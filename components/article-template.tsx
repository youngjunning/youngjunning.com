'use client';
import { useState, type FormEvent } from 'react';
import { articleDraft } from '@/lib/article-draft.mjs';
export function ArticleTemplate() {
  const [title, setTitle] = useState(''), [topic, setTopic] = useState('engineering'), [collection, setCollection] = useState('docs'), [error, setError] = useState('');
  function download(event: FormEvent) {
    event.preventDefault();
    try {
      const id = Array.from(crypto.getRandomValues(new Uint8Array(8)), byte => byte.toString(16).padStart(2, '0')).join('');
      const draft = articleDraft({ title, topic, collection, id, date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }) });
      const url = URL.createObjectURL(new Blob([draft.content], { type: 'text/markdown;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = draft.filename; anchor.click(); URL.revokeObjectURL(url); setError('');
    } catch (error) { setError(error instanceof Error ? error.message : '模板生成失败。'); }
  }
  return <form className="template-form" onSubmit={download}><label>文章标题<input value={title} onChange={event => setTitle(event.target.value)} required maxLength={100} /></label><label>主题<select value={topic} onChange={event => setTopic(event.target.value)}><option value="principles">原理解析</option><option value="architecture">架构设计</option><option value="engineering">工程实践</option><option value="diagnostics">诊断优化</option><option value="reflections">复盘思考</option></select></label><label>集合<select value={collection} onChange={event => setCollection(event.target.value)}><option value="docs">文章与观点</option><option value="ata">ATA</option></select></label><button className="template-download" type="submit">下载 Markdown 草稿</button>{error && <p role="alert">{error}</p>}</form>;
}
