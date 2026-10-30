export function selectSources(question, allSources) {
  const lower = question.toLowerCase();
  const tokens = [...new Set(lower.match(/[a-z][a-z0-9_-]+|[\u4e00-\u9fff]{2,}/g) || [])].flatMap(token => /[\u4e00-\u9fff]/.test(token) ? Array.from({length:token.length-1}, (_,i) => token.slice(i,i+2)) : [token]);
  const ranked = allSources.map(source => ({ ...source, score: tokens.reduce((sum, token) => sum + (source.text.toLowerCase().includes(token) ? 1 : 0), 0) })).sort((a,b) => b.score - a.score);
  return ranked.filter(source => source.score > 0).slice(0, 6).map(({ score: _score, ...source }) => ({ ...source, text: source.text.slice(0, 6000) }));
}
export function validateAnswer(output, sources) {
  if (!output || typeof output.answer !== 'string' || !output.answer.trim() || !Array.isArray(output.sourceIds) || output.sourceIds.length === 0) throw new Error('Missing answer or citations');
  if (output.sourceIds.some(id => typeof id !== 'string' || !sources.some(source => source.id === id))) throw new Error('Unverified citation');
  // The model writes plain text only; links always come from the known source list.
  if (/https?:\/\/|\]\(|<a\b/i.test(output.answer)) throw new Error('Unverified answer link');
  return { answer: output.answer, sources: [...new Set(output.sourceIds)].map(id => { const source = sources.find(source => source.id === id); return { id, title: source.title, href: source.href }; }) };
}
