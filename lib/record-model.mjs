const idPattern = /^[a-f0-9]{16}$/;
const fields = {
  experience: ['period', 'start', 'end', 'ongoing'],
  project: ['label', 'role', 'tags', 'status', 'goal', 'outcomes'],
  judgment: ['basis', 'alternatives', 'outcome'],
  change: ['subjectId', 'before', 'after', 'reason'],
  thought: [],
};
const common = ['id', 'kind', 'title', 'date', 'recordedAt', 'text', 'context', 'visibility', 'articleId', 'projectId', 'relatedIds', 'sources'];
function object(value) { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function ensure(condition, message) { if (!condition) throw new Error('Personal records: ' + message); }
function text(value) { return typeof value === 'string' && value.trim().length > 0; }
function date(value, partial = false) {
  if (typeof value !== 'string' || !(partial ? /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/ : /^\d{4}-\d{2}-\d{2}$/).test(value)) return false;
  const full = value.length === 4 ? value + '-01-01' : value.length === 7 ? value + '-01' : value;
  return !Number.isNaN(Date.parse(full)) && new Date(full).toISOString().slice(0, 10) === full;
}
function strings(value) { return Array.isArray(value) && value.every(text); }

/** Validate the complete source before projecting the shared website snapshot.
 * @param {unknown} input
 * @param {Set<string>} articleIds
 * @returns {import('./record-types').RecordStore}
 */
export function prepareRecords(input, articleIds) {
  ensure(object(input) && input.version === 2 && Array.isArray(input.records), 'version 2 and records array required');
  const records = input.records;
  const byId = new Map();
  for (const record of records) {
    ensure(object(record) && typeof record.id === 'string' && idPattern.test(record.id), 'valid stable id required');
    ensure(!byId.has(record.id), 'duplicate id ' + record.id);
    ensure(Object.hasOwn(fields, record.kind), 'unknown kind for ' + record.id);
    const allowed = [...common, ...fields[record.kind]];
    ensure(Object.keys(record).every((key) => allowed.includes(key)), 'unknown field for ' + record.id);
    ensure(['title', 'text', 'context'].every((key) => text(record[key])), 'title, text and context required for ' + record.id);
    ensure(record.date === null || date(record.date), 'invalid event date for ' + record.id);
    ensure(date(record.recordedAt), 'invalid recordedAt for ' + record.id);
    ensure(['shared', 'private'].includes(record.visibility), 'explicit visibility required for ' + record.id);
    ensure(record.articleId === null || articleIds.has(record.articleId), 'unknown article for ' + record.id);
    ensure(record.projectId === null || idPattern.test(record.projectId), 'invalid projectId for ' + record.id);
    ensure(Array.isArray(record.relatedIds) && record.relatedIds.every((id) => typeof id === 'string' && idPattern.test(id)), 'invalid relatedIds for ' + record.id);
    ensure(Array.isArray(record.sources) && record.sources.length > 0, 'source required for ' + record.id);
    for (const source of record.sources) {
      ensure(object(source) && ['statement', 'archive', 'article'].includes(source.kind) && text(source.label), 'invalid source for ' + record.id);
      ensure(Object.keys(source).every((key) => ['kind', 'label', 'articleId'].includes(key)), 'unknown source field for ' + record.id);
      ensure(source.kind === 'article' ? articleIds.has(source.articleId) : source.articleId === undefined, 'invalid source article for ' + record.id);
    }
    if (record.kind === 'experience') {
      ensure(text(record.period) && typeof record.ongoing === 'boolean', 'experience period required');
      ensure((record.start === null || date(record.start, true)) && (record.end === null || date(record.end, true)), 'invalid experience period');
      ensure(!(record.ongoing && record.end !== null), 'ongoing experience cannot have an end');
      ensure(record.start === null || record.end === null || record.start <= record.end || record.start.startsWith(record.end), 'experience end precedes start');
    } else if (record.kind === 'project') {
      ensure(['label', 'role', 'goal'].every((key) => text(record[key])) && strings(record.tags) && strings(record.outcomes), 'project fields required');
      ensure(['ongoing', 'completed', 'paused', 'unknown'].includes(record.status), 'invalid project status');
    } else if (record.kind === 'judgment') {
      ensure(text(record.basis) && strings(record.alternatives) && (record.outcome === null || text(record.outcome)), 'judgment basis required');
    } else if (record.kind === 'change') {
      ensure(['subjectId', 'before', 'after', 'reason'].every((key) => text(record[key])), 'change subject, before, after and reason required');
      ensure(record.before !== record.after, 'change must preserve different before and after values');
    }
    byId.set(record.id, record);
  }
  for (const record of records) {
    const related = [...record.relatedIds, ...(record.projectId ? [record.projectId] : []), ...(record.kind === 'change' ? [record.subjectId] : [])];
    for (const id of related) {
      ensure(id !== record.id && byId.has(id), 'missing or self record link for ' + record.id);
      ensure(record.visibility !== 'shared' || byId.get(id).visibility === 'shared', 'shared record cannot link private record');
    }
    ensure(!record.projectId || byId.get(record.projectId).kind === 'project', 'projectId must reference a project');
  }
  const shared = records.filter((record) => record.visibility === 'shared');
  const occurred = (record) => record.date || (record.kind === 'experience' ? record.start : '') || '';
  shared.sort((a, b) => occurred(b).localeCompare(occurred(a)) || b.recordedAt.localeCompare(a.recordedAt) || a.id.localeCompare(b.id));
  return { version: 2, records: shared };
}
