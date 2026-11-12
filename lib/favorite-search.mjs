import { subjectLabel } from './content-subjects.mjs';

export const favoriteTypeLabels = { tool: '项目与工具', reference: '资料', concept: '概念', method: '方法' };
export const attributionLabels = { user: '本人表达', source: '资料整理', ai: 'AI 辅助整理', mixed: '本人表达与补充整理' };
/** @param {string} type @returns {string} */
export const favoriteTypeLabel = type => favoriteTypeLabels[type] || type;

/** Search independently by content type, subject and evidenced project use. */
export function filterFavorites(favorites, query = '', type = 'all', subject = 'all', usedOnly = false, tag = '') {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return favorites.filter(item => (type === 'all' || item.type === type)
    && (subject === 'all' || item.subjects.includes(subject))
    && (!usedOnly || Boolean(item.usages?.length))
    && (!tag || item.tags.includes(tag))
    && words.every(word => [item.title, item.summary, item.reason, ...item.tags,
      ...item.subjects.map(subjectLabel), ...Object.values(item.note || {}),
      JSON.stringify(item.usages || [])].join(' ').toLocaleLowerCase().includes(word)));
}
