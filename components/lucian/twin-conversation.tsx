// Lucian UX/UI Prompt #078 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#078
// Lucian UX/UI Prompt #028 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#028
// Lucian UX/UI Prompt #039 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#039
'use client';

import { siteProfile } from '@/lib/site-profile.mjs';
import Link from 'next/link';
import persona from '@/lib/persona';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type PointerEvent } from 'react';
import type { ConversationMessage, ConversationReply } from '@/lib/twin-types';
import { conversationSourceLabel, downloadCorrection } from '@/lib/conversation-feedback.mjs';
import './lucian-078.css';
import './lucian-028.css';
import './twin-conversation.css';
import UniverseScene, { UniverseField } from './universe-scene';

const LIMIT = 1200;
type Turn = { id: string; question: string; quote: string; status: 'pending' | 'complete' | 'error' | 'cancelled'; reply?: ConversationReply; error?: string };
type Suggestion = { id: string; question: string; kind: string; topic?: string };
import { pickConversationSuggestions } from '@/lib/twin-suggestions.mjs';

export default function TwinConversation({ available, modelName }: { available: boolean; modelName: string }) {
  const [starters, setStarters] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(available);
  const [suggestionsError, setSuggestionsError] = useState('');
  const suggestionRequest = useRef<AbortController | null>(null);
  const loadSuggestions = useCallback(async () => {
    if (!available) return;
    suggestionRequest.current?.abort();
    const request = new AbortController();
    suggestionRequest.current = request;
    const timer = setTimeout(() => request.abort('timeout'), 50000);
    try {
      const response = await fetch('/api/chat/suggestions', { signal: request.signal, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.suggestions)) throw new Error('suggestions_unavailable');
      if (request.signal.aborted) return;
      setStarters(current => pickConversationSuggestions(result.suggestions, current.map(item => item.id)));
    } catch {
      if (request.signal.aborted && request.signal.reason !== 'timeout') return;
      setStarters([]); setSuggestionsError('推荐问题暂不可用，可以直接提问或稍后重试。');
    } finally {
      clearTimeout(timer);
      if (suggestionRequest.current === request) { suggestionRequest.current = null; setSuggestionsLoading(false); }
    }
  }, [available]);
  function refreshSuggestions() {
    if (!available) return;
    setSuggestionsLoading(true); setSuggestionsError(''); void loadSuggestions();
  }
  useEffect(() => {
    const timer = setTimeout(() => { void loadSuggestions(); }, 0);
    return () => { clearTimeout(timer); suggestionRequest.current?.abort(); suggestionRequest.current = null; };
  }, [loadSuggestions]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [quote, setQuote] = useState('');
  const [pending, setPending] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const swipe = useRef<{ x: number; id: string } | null>(null);
  const characters = Array.from(draft).length;
  const active = turns.find(turn => turn.id === activeId) ?? turns[turns.length - 1];
  const sources = active?.reply?.sources ?? [];
  const source = sources.find(item => item.id === sourceId) ?? sources[0];
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const node = tabs.current;
    if (!node) return;
    function resize() {
      const selected = node!.querySelector<HTMLElement>('[aria-selected="true"]');
      if (selected && pill.current) { pill.current.style.setProperty('--x', `${selected.offsetLeft}px`); pill.current.style.setProperty('--w', `${selected.offsetWidth}px`); }
    }
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    resize();
    return () => observer.disconnect();
  }, [active?.id, turns.length]);
  useEffect(() => {
    const node = editor.current;
    if (!node) return;
    node.style.height = '24px';
    node.style.height = Math.min(144, node.scrollHeight) + 'px';
    node.style.overflowY = node.scrollHeight > 144 ? 'auto' : 'hidden';
  }, [draft]);
  useEffect(() => {
    log.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [active?.id, active?.status]);
  function replyTo(text: string) { setQuote(text.slice(0, 350)); editor.current?.focus(); }
  function pointerStart(event: PointerEvent<HTMLElement>, id: string) {
    if (event.pointerType !== 'touch') return;
    swipe.current = { x: event.clientX, id };
  }
  function pointerEnd(event: PointerEvent<HTMLElement>, id: string, text: string) {
    if (swipe.current?.id === id && event.clientX - swipe.current.x > 60) replyTo(text);
    swipe.current = null;
  }
  async function send(question: string, quoted = '', retryId?: string) {
    if (controller.current || !available || !question.trim() || Array.from(question).length > LIMIT) return;
    const id = retryId || crypto.randomUUID();
    const earlier = retryId ? turns.slice(0, turns.findIndex((turn) => turn.id === retryId)) : turns;
    const previous = earlier.filter((turn) => turn.status === 'complete').slice(-4);
    const history: ConversationMessage[] = previous.flatMap((turn) => [
      { role: 'user' as const, content: (turn.question + (turn.quote ? '\n追问上下文：' + turn.quote : '')).slice(0, 1800) },
      { role: 'assistant' as const, content: turn.reply!.paragraphs.map((paragraph) => paragraph.text).join('\n').slice(0, 1800) },
    ]);
    while (history.reduce((sum, message) => sum + message.content.length, 0) > 9000) history.splice(0, 2);
    history.push({ role: 'user', content: question.trim() + (quoted ? '\n\n追问上下文（仅用于理解指代，不作为事实来源）：' + quoted : '') });
    const next: Turn = { id, question: question.trim(), quote: quoted, status: 'pending' };
    setActiveId(id); setSourceId(null);
    setTurns((value) => retryId ? value.map((turn) => turn.id === id ? next : turn) : [...value, next]);
    if (!retryId) { setDraft(''); setQuote(''); }
    setPending(true);
    const active = new AbortController(); controller.current = active;
    const timeout = setTimeout(() => active.abort('timeout'), 55000);
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history }), signal: active.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || '暂时无法回答，请重试。');
      setTurns((value) => value.map((turn) => turn.id === id ? { ...turn, status: 'complete', reply: result } : turn));
    } catch (error) {
      const cancelled = active.signal.aborted && active.signal.reason !== 'timeout';
      const message = cancelled ? '已停止本次回答，可以重新提问。' : active.signal.aborted ? '等待回答超时，请重试。' : error instanceof Error ? error.message : '网络暂时不可用，请重试。';
      setTurns((value) => value.map((turn) => turn.id === id ? { ...turn, status: cancelled ? 'cancelled' : 'error', error: message } : turn));
    } finally {
      clearTimeout(timeout); controller.current = null; setPending(false);
    }
  }
  function submit(event: FormEvent) { event.preventDefault(); void send(draft, quote); }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') { setQuote(''); return; }
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void send(draft, quote); }
  }
  const history = !!turns.length && <div className="universe-history"><span>探索轨迹</span><div className="u039-tabs" ref={tabs} role="tablist" aria-label="探索轨迹"><span className="u039-pill" ref={pill} aria-hidden="true" />{turns.map((turn, index) => <button key={turn.id} id={`signal-${turn.id}`} type="button" className="u039-tab" role="tab" aria-controls="universe-answer" aria-selected={turn.id === active.id} tabIndex={turn.id === active.id ? 0 : -1} title={turn.question} onClick={() => { setActiveId(turn.id); setSourceId(null); }} onKeyDown={event => { const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0; const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? turns.length - 1 : direction ? (index + direction + turns.length) % turns.length : -1; if (nextIndex < 0) return; event.preventDefault(); setActiveId(turns[nextIndex].id); setSourceId(null); const button = tabs.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]; button?.focus(); button?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }}> <span>{String(index + 1).padStart(2, '0')}</span>{turn.question}{turn.status === 'pending' && ' ···'}</button>)}</div></div>;
  return <section className="twin-chat-layout">
    <div className={`ux u341 twin-chat ${active ? 'has-signal' : ''}`}>
      <UniverseField />
      <header className="universe-header">{history || <span className="universe-wordmark">INNER UNIVERSE <span>/</span> {siteProfile.siteName}</span>}<span className="universe-connection"><i />{available ? '记忆信号已连接' : '模型服务未连接'}</span>{!!turns.length && <button className="u028-tool chat-clear" type="button" disabled={pending} onClick={() => { setTurns([]); setActiveId(null); setSourceId(null); setQuote(''); setDraft(''); refreshSuggestions(); }} aria-label="开始新探索" title="开始新探索"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M20 12a8 8 0 1 0-2 5" /></svg></button>}</header>
      <div className="universe-scroll" ref={log}>
        <div className="universe-stage">
          <div className="universe-observatory"><UniverseScene pending={active?.status === 'pending'} sources={sources} selected={source?.id ?? null} onSelect={setSourceId} complete={active?.status === 'complete'} />
            {source && <div className="u039-row universe-source" key={`${active.id}-${source.id}`} id="universe-source"><span className="source-coordinate">{String(sources.indexOf(source) + 1).padStart(2, '0')} / {conversationSourceLabel(source.kind, source.attribution)}</span><Link href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<span aria-hidden="true"> ↗</span></Link><p>{source.excerpt.slice(0, 210)}{source.excerpt.length > 210 ? '…' : ''}</p><small>{source.kind === 'code' ? `快照 ${source.commit?.slice(0, 8) || '版本未记录'}` : source.date || '原日期未记录'}{source.lineStart ? ` · ${source.kind === 'code' ? '原文件' : '正文'}第 ${source.lineStart}–${source.lineEnd} 行` : ''}</small></div>}
          </div>
          <div className="universe-content">
            {!active ? <div className="universe-welcome"><div className="universe-eyebrow">每一段记忆，都有引力。</div><h1>向一个宇宙，<br />发出你的<span>好奇。</span></h1><p>这里散落着{siteProfile.name}的经历、判断和思考。<br />一个问题，让遥远的记忆彼此连接。</p><div className="chat-suggestions" aria-busy={suggestionsLoading}><span className="suggestions-label" aria-live="polite">{suggestionsLoading ? '正在从记忆中寻找值得追问的问题…' : suggestionsError || (starters.length ? '从一束信号开始' : '暂无依据充分的推荐问题，可以直接提问。')}</span>{starters.map(({ id, question }, index) => <button className="u028-send" type="button" key={id} disabled={!available || pending || suggestionsLoading} onClick={() => void send(question)}><span className="signal-number">0{index + 1}</span><span>{question}</span><span aria-hidden="true">↗</span></button>)}{available && <button className="u028-send chat-refresh" type="button" disabled={suggestionsLoading} onClick={() => void refreshSuggestions()}>{suggestionsLoading ? '正在寻找信号…' : suggestionsError ? '重新寻找信号 ↻' : '寻找其他信号 ↻'}</button>}</div></div> : <div className="universe-response" id="universe-answer" role="tabpanel" aria-labelledby={`signal-${active.id}`} key={active.id}>
              <div className="universe-eyebrow">SIGNAL {String(turns.indexOf(active) + 1).padStart(2, '0')} <span>/ 你的好奇</span></div><h1>{active.question}</h1>{active.quote && <blockquote className="universe-quote">{active.quote}</blockquote>}
              <div aria-live="polite" aria-busy={active.status === 'pending'}>
                {active.status === 'pending' && <div className="universe-wait" role="status"><span className="u078-ty"><i /><i /><i /></span><h2>让记忆，慢慢聚拢。</h2><p>正在查阅个人记录与手记，等待有依据的回应。</p><span className="signal-wave" aria-hidden="true" /></div>}
                {active.reply && <article className="chat-answer" onPointerDown={(event) => pointerStart(event, active.id)} onPointerUp={(event) => pointerEnd(event, active.id, active.reply!.paragraphs[0].text)} onPointerCancel={() => { swipe.current = null; }}><div className="answer-label">宇宙的回响 <span>{active.reply.sources.length} 个来源</span></div>{active.reply.insufficient && <span className="chat-insufficient">这片星域的资料还不够完整，以下只回答已有依据的部分。</span>}{active.reply.paragraphs.map((paragraph, index) => <p key={index}>{paragraph.text}{paragraph.sourceIds.map(id => { const position = sources.findIndex(item => item.id === id); return <a className="chat-citation" key={id} href="#universe-source" onClick={() => setSourceId(id)} aria-label={`查看来源 ${position + 1}：${sources[position].title}`}>[{position + 1}]</a>; })}</p>)}<button className="u028-send universe-followup" type="button" onClick={() => replyTo(active.reply!.paragraphs[0].text)}>沿着这段回答，继续探索 <span aria-hidden="true">↗</span></button><button className="u028-send universe-followup" type="button" onClick={() => downloadCorrection(active.question, active.reply!)}>导出纠错上下文 ↗</button><small>补充不准确之处后交给{siteProfile.name}核对，反馈不会自动改写记忆。</small></article>}
                {(active.status === 'error' || active.status === 'cancelled') && <div className="chat-error" role={active.status === 'error' ? 'alert' : 'status'}><h2>{active.status === 'cancelled' ? '信号已暂停。' : '这次信号没有抵达。'}</h2><p>{active.error}</p><button className="u028-send" type="button" disabled={pending} onClick={() => void send(active.question, active.quote, active.id)}>重新发送信号 ↗</button></div>}
              </div>
            </div>}
          </div>
        </div>
      </div>
      <div className="chat-dock">
      {!available && <p className="chat-unavailable" role="status">对话暂不可用。可以先阅读<Link href="/records">个人记录</Link>或<Link href="/blog">手记</Link>。</p>}
      <div className={`u078-reply ${quote ? 'on' : ''}`}><div><div className="u078-rbox"><span><b>继续追问</b><em>{quote}</em></span><button className="u078-rx" type="button" tabIndex={quote ? 0 : -1} aria-label="取消追问引用" onClick={() => setQuote('')}><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3L3 9" /></svg></button></div></div></div>
      <form className={`ux u028 chat-composer ${characters > LIMIT - 100 ? 'is-near' : ''} ${characters > LIMIT ? 'is-over' : ''}`} style={{ '--p': Math.min(1, characters / LIMIT) } as CSSProperties} onSubmit={submit}>
        <div className="u028-box"><textarea className="u028-ta" rows={1} ref={editor} value={draft} disabled={!available} onChange={(event) => setDraft(event.target.value)} onKeyDown={keyDown} aria-label={`向${persona.siteName}提问`} aria-describedby="chat-input-help" placeholder="向这个宇宙，发出一个问题…" />
          <div className="u028-foot"><span className={`chat-model${available ? '' : ' is-unavailable'}`} title={`当前配置模型：${modelName}${available ? '' : '（未连接）'}`}><i aria-hidden="true" /><span>模型 · {modelName}</span></span><span id="chat-input-help">Enter 发送 · Shift+Enter 换行</span><span className="u028-ring" aria-hidden="true"><svg viewBox="0 0 30 30"><circle className="bg" cx="15" cy="15" r="12" /><circle className="fg" cx="15" cy="15" r="12" /></svg><span className="u028-left">{LIMIT - characters}</span></span>{pending ? <button className="u028-send" type="button" onClick={() => controller.current?.abort('user')}>停止回答</button> : <button className="u028-send" type="submit" disabled={!available || !draft.trim() || characters > LIMIT} aria-disabled={!available || !draft.trim() || characters > LIMIT}>发送</button>}</div>
        </div>
      </form>
      <p className="chat-disclaimer">{siteProfile.name}的数字分身，非本人在线。回应有来源，未知会说明。对话仅留在本页，刷新后清空。<Link href="/records">记忆 ↗</Link><Link href="/blog">文章 ↗</Link></p>
      </div>
    </div>
  </section>;
}
