/** Mix source kinds and topics; exclude the current batch when possible. */
export function pickConversationSuggestions(pool, previous = []) {
  const fresh = pool.filter(item => !previous.includes(item.id));
  const candidates = [...(fresh.length >= Math.min(3, pool.length) ? fresh : pool)];
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const chosen = [];
  const hasTopic = item => item.topic && chosen.some(selected => selected.topic === item.topic);
  for (const kind of ['record', 'blog']) {
    const matches = candidates.filter(item => item.kind === kind);
    const item = matches.find(item => !hasTopic(item)) || matches[0];
    if (item) chosen.push(item);
  }
  for (const distinctTopics of [true, false]) {
    for (const item of candidates) {
      if (chosen.length >= 3) break;
      if (!chosen.includes(item) && (!distinctTopics || !hasTopic(item))) chosen.push(item);
    }
  }
  return chosen.slice(0, 3);
}
