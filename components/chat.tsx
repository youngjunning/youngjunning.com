'use client';
import Link from 'next/link';
import { useState, useRef, useEffect, type FormEvent } from 'react';
import { ArrowUpRight, ArrowUp, RotateCcw } from 'lucide-react';
import { MagicBook } from '@/components/magic-book';
type Message = { role: 'user' | 'assistant'; content: string; sources?: { id: string; title: string; href: string }[] };
export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]), [input, setInput] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const composing = useRef(false), compositionEndedAt = useRef(-Infinity);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' }); }, [messages, busy]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!input.trim() || busy) return;
    const pending = [...messages, { role: 'user' as const, content: input.trim() }];
    setMessages(pending); setInput(''); setBusy(true); setError('');
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: pending.slice(-11).map(({ role, content }) => ({ role, content })) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '对话暂时不可用。');
      setMessages([...pending, { role: 'assistant', content: result.answer, sources: result.sources }]);
    } catch (e) { setError(e instanceof Error ? e.message : '对话暂时不可用。'); setInput(pending.at(-1)?.content || ''); setMessages(pending.slice(0,-1)); }
    finally { setBusy(false); }
  }
  return <div className="chat-layout magic-chat"><div className="chat-intro"><MagicBook /><span className="magic-chat-label">花园里的魔法书</span><h1>带着好奇，翻开一页。</h1><p>我是硅基俊宁。关于经历、项目和思考，从我的公开记录聊起。<br />回答附带来源；没有记录的事情，我会说明。</p></div>
    {!messages.length && <div className="suggestions">{['介绍一下你自己','你如何记录项目中的判断？','你最近在关注什么？'].map(question => <button key={question} onClick={() => setInput(question)}>{question}</button>)}</div>}
    <div className="chat-log" role="log" aria-label="对话记录" aria-live="polite">{messages.map((message,index) => <div key={index} className={'message ' + message.role}>{message.content}{message.sources && message.sources.length > 0 && <div className="source-box">参考来源{message.sources.map(source => <div key={source.id}><Link href={source.href}>{source.title} <ArrowUpRight size={12} style={{display:'inline'}} /></Link></div>)}</div>}</div>)}{busy && <p className="eyebrow" role="status">正在查阅公开资料…</p>}<div ref={end} /></div>
    {error && <p className="error" role="alert">{error}</p>}<form className="chat-form" onSubmit={submit}><textarea aria-label="你的问题" placeholder="有什么想了解的？" value={input} maxLength={2000} disabled={busy} onChange={event => setInput(event.target.value)} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; compositionEndedAt.current = performance.now(); }} onKeyDown={event => { if (composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || performance.now() - compositionEndedAt.current < 80) return; if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button type="submit" aria-label="发送问题" disabled={busy || !input.trim()}><ArrowUp size={18} /></button></form>
    <div className="chat-foot">问题及相关公开资料会发送至模型服务 · 不自动写入记忆{messages.length > 0 && <button style={{marginLeft:14,border:0,background:'none',cursor:'pointer'}} disabled={busy} onClick={() => {setMessages([]);setError('');}}><RotateCcw size={10} style={{display:'inline'}} /> 清空</button>}</div>
  </div>;
}
