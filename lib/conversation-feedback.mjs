export function conversationSourceLabel(kind, attribution) {
  const label = { record: '个人记录', blog: '手记', code: '工程资料', resource: '外部资源', note: '知识笔记' }[kind] || '共享资料';
  const origin = { user: '本人陈述', source: '原始资料', ai: 'AI 整理', mixed: '混合归属' }[attribution];
  return origin ? `${label} · ${origin}` : label;
}

export function correctionContext(question, reply) {
  return { version: 1, purpose: '待本人核对的回答纠错', correction: '', question, paragraphs: reply.paragraphs, sources: reply.sources.map(({ id, kind, title, url, sha256, attribution }) => ({ id, kind, title, url, sha256, attribution })), snapshot: reply.snapshot };
}

export function downloadCorrection(question, reply) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(correctionContext(question, reply), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'digital-self-answer-correction.json';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
