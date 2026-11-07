import { inferSubjects } from './content-subjects.mjs';

/** @param {{ documents?: import('./types').Document[], records?: import('./record-types').PersonalRecord[], favorites?: import('./favorite-types').Favorite[] }} input */
export function buildSubjectCollection({ documents = [], records = [], favorites = [] }) {
  return [
    ...documents.map(item => ({ id: 'article:' + item.id, title: item.title, summary: item.summary, kind: 'article', label: '手记', subjects: inferSubjects(item), date: item.updatedAt || item.date, tags: item.tags, href: item.url })),
    ...records.map(item => ({ id: 'record:' + item.id, title: item.title, summary: item.text, kind: 'record', label: '个人记录', subjects: inferSubjects({ ...item, text: item.text + ' ' + item.context }), date: item.recordedAt, tags: item.kind === 'project' ? item.tags : [], href: '/records/' + item.id })),
    ...favorites.map(item => ({ id: 'favorite:' + item.id, title: item.title, summary: item.summary, kind: item.type, label: { tool: '项目与工具', reference: '资料', concept: '概念', method: '方法' }[item.type], subjects: item.subjects, date: item.updatedAt || item.savedAt, tags: item.tags, href: '/favorites#' + item.id })),
  ];
}
