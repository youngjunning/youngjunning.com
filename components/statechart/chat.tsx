'use client';
import { siteProfile } from '@/lib/site-profile.mjs';
import { useEffect, useRef, useState } from 'react';
import type { ConversationMessage, ConversationReply } from '@/lib/twin-types';
import { conversationSourceLabel, downloadCorrection } from '@/lib/conversation-feedback.mjs';
type Turn = { id: string; question: string; quote: string; status: 'pending' | 'complete' | 'error' | 'cancelled'; reply?: ConversationReply; error?: string };
const LIMIT = 1200;
export default function PaperChat({ available, modelName }: { available: boolean; modelName: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [quote, setQuote] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; question: string }[]>([]);
  const [suggestionError, setSuggestionError] = useState('');
  const [suggestionBatch, setSuggestionBatch] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const last = useRef<HTMLDivElement>(null);
  const pending = turns.some(turn => turn.status === 'pending');
  useEffect(() => {
    if (!available) return;
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 50000);
    fetch('/api/chat/suggestions', { signal: abort.signal, cache: 'no-store' }).then(response => { if (!response.ok) throw new Error('suggestions'); return response.json(); }).then(data => { setSuggestions((data.suggestions || []).slice((suggestionBatch % 3) * 3, (suggestionBatch % 3) * 3 + 3)); setSuggestionError(''); }).catch(() => { if (!abort.signal.aborted) setSuggestionError('推荐问题暂不可用，可以直接提问。'); }).finally(() => clearTimeout(timeout));
    return () => { abort.abort(); clearTimeout(timeout); };
  }, [available, suggestionBatch]);
  useEffect(() => () => controller.current?.abort('unmount'), []);
  useEffect(() => { if (turns.length) last.current?.scrollIntoView({ block: 'nearest' }); }, [turns.length, pending]);
  function follow(text: string) { setQuote(text.slice(0, 350)); editor.current?.focus(); }
  async function send(question: string, quoted = '', retryId?: string) {
    if (controller.current || !available || !question.trim() || Array.from(question).length > LIMIT) return;
    const id = retryId || crypto.randomUUID();
    const previous = (retryId ? turns.slice(0, turns.findIndex(turn => turn.id === retryId)) : turns).filter(turn => turn.status === 'complete').slice(-4);
    const messages: ConversationMessage[] = previous.flatMap(turn => [{ role: 'user', content: (turn.question + (turn.quote ? '\n追问上下文：' + turn.quote : '')).slice(0, 1800) }, { role: 'assistant', content: turn.reply!.paragraphs.map(paragraph => paragraph.text).join('\n').slice(0, 1800) }]);
    while (messages.reduce((sum, message) => sum + message.content.length, 0) > 9000) messages.splice(0, 2);
    messages.push({ role: 'user', content: question.trim() + (quoted ? '\n\n追问上下文（仅用于理解指代，不作为事实来源）：' + quoted : '') });
    const turn: Turn = { id, question: question.trim(), quote: quoted, status: 'pending' };
    setTurns(current => retryId ? current.map(item => item.id === id ? turn : item) : [...current, turn]);
    setDraft(''); setQuote('');
    const abort = new AbortController(); controller.current = abort;
    const timer = setTimeout(() => abort.abort('timeout'), 55000);
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }), signal: abort.signal });
      const reply = await response.json();
      if (!response.ok) throw new Error(reply.error?.message || '暂时无法回答，请重试。');
      if (abort.signal.aborted) throw new DOMException('Request aborted', 'AbortError');
      setTurns(current => current.map(item => item.id === id ? { ...item, status: 'complete', reply } : item));
    } catch (error) {
      if (abort.signal.reason === 'unmount') return;
      const cancelled = abort.signal.aborted && abort.signal.reason !== 'timeout';
      setTurns(current => current.map(item => item.id === id ? { ...item, status: cancelled ? 'cancelled' : 'error', error: cancelled ? '已停止回答。' : abort.signal.aborted ? '等待超时，请重试。' : error instanceof Error ? error.message : '请求失败，请重试。' } : item));
    } finally { clearTimeout(timer); if (controller.current === abort) controller.current = null; }
  }
  return <div className="sc-chat"><div className="sc-chat-meta"><span>{available ? '记忆资料已连接' : '模型服务未连接'} · {modelName}</span><button type="button" disabled={pending || !turns.length} onClick={() => { setTurns([]); setQuote(''); setDraft(''); }}>开始新对话</button></div>
    {!turns.length && <div className="sc-chat-opening"><div className="sc-chat-stamp">问<br />↓<br />查阅<br />↓<br />有据可答</div><div><h2>把一个问题，写在纸上。</h2><p>这里是{siteProfile.name}的数字分身。回答来自共享记录、手记与百宝箱，资料不足时会说明。</p><div className="sc-suggestions">{suggestions.map(item => <button key={item.id} disabled={pending} onClick={() => void send(item.question)}>{item.question} →</button>)}</div><p role="status">{suggestionError}</p>{available && <button type="button" onClick={() => setSuggestionBatch(value => value + 1)}>换一组问题 ↻</button>}</div></div>}
    <div className="sc-chat-turns" aria-label="对话记录">{turns.map((turn, i) => <section className="sc-chat-turn" key={turn.id}><header><span className="sc-kicker">LETTER {String(i + 1).padStart(2, '0')}</span><h2>{turn.question}</h2>{turn.quote && <blockquote>追问：{turn.quote}</blockquote>}</header><div className="sc-chat-response" aria-live="polite">{turn.status === 'pending' && <p role="status">正在查阅共享资料……</p>}{turn.error && <div role={turn.status === 'error' ? 'alert' : 'status'}><p>{turn.error}</p><button disabled={pending} onClick={() => void send(turn.question, turn.quote, turn.id)}>重新回答</button></div>}{turn.reply && <><div className="sc-chat-answer">{turn.reply.insufficient && <p className="sc-warning">现有资料不足，以下只说明已有依据的部分。</p>}{turn.reply.paragraphs.map((paragraph, j) => <p key={j}>{paragraph.text}{paragraph.sourceIds.map(id => { const number = turn.reply!.sources.findIndex(source => source.id === id); return <a className="sc-citation" key={id} onClick={() => { const detail = document.getElementById(`source-${turn.id}-${number}`); if (detail instanceof HTMLDetailsElement) detail.open = true; }} href={`#source-${turn.id}-${number}`}>[{number + 1}]</a>; })}</p>)}<button disabled={pending} onClick={() => follow(turn.reply!.paragraphs[0]?.text || '')}>引用这段，继续问 →</button><button type="button" onClick={() => downloadCorrection(turn.question, turn.reply!)}>导出纠错上下文 ↓</button><small>补充不准确之处后交给{siteProfile.name}核对，反馈不会自动改写记忆。</small></div><aside className="sc-source-notes"><h3>这封回复的出处</h3>{turn.reply.sources.map((source, j) => <details id={`source-${turn.id}-${j}`} key={source.id}><summary>[{j + 1}] {source.title}</summary><small>{conversationSourceLabel(source.kind, source.attribution)}</small><p>{source.excerpt}</p>{source.commit && <small>源码快照 {source.commit.slice(0, 8)}</small>}<a href={source.url} target="_blank" rel="noreferrer">回到来源 ↗</a></details>)}</aside></>}</div></section>)}</div><div ref={last} />
    <form className="sc-composer" onSubmit={event => { event.preventDefault(); void send(draft, quote); }}>{quote && <blockquote>{quote}<button type="button" onClick={() => setQuote('')}>取消引用 ×</button></blockquote>}<label htmlFor="sc-question">写下你的问题</label><textarea id="sc-question" ref={editor} value={draft} disabled={!available} rows={4} onChange={event => setDraft(event.target.value)} placeholder="想了解哪段经历，或哪一次判断？" onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void send(draft, quote); } }} /><div><span>{Array.from(draft).length} / {LIMIT} · Enter 发送，Shift+Enter 换行</span>{pending ? <button type="button" onClick={() => controller.current?.abort('user')}>停止回答</button> : <button type="submit" disabled={!available || !draft.trim() || Array.from(draft).length > LIMIT}>递出问题 →</button>}</div><p>数字分身，非本人在线。对话仅保留在本页，刷新或切换主题后清空。</p></form>
  </div>;
}
