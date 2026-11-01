import { topicIds } from './topics.mjs';

/** @param {{title: string, topic: string, collection: string, id: string, date: string}} input */
export function articleDraft({ title, topic, collection, id, date }) {
  title = title.trim();
  if (!title || title.length > 100 || /[\x00-\x1f/\\]/.test(title) || title === '.' || title === '..' || /^(README|AGENTS|MIGRATION)$/i.test(title)) throw new Error('标题需为 1–100 字，不能含换行、路径分隔符或使用保留名称');
  if (!topicIds.includes(topic)) throw new Error('请选择有效的文章主题');
  if (!['docs', 'ata'].includes(collection)) throw new Error('请选择文章与观点或 ATA');
  if (!/^[a-f0-9]{16}$/.test(id)) throw new Error('文章 ID 格式不正确');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('日期格式不正确');
  const fields = [
    '---', `id: ${JSON.stringify(id)}`, `title: ${JSON.stringify(title)}`,
    `date: ${JSON.stringify(date)}`, 'description: ""', `topic: ${topic}`,
    'tags: []', `collection: ${collection}`, 'draft: true',
    ...(collection === 'ata' ? ['publication:', '  status: draft'] : []),
    '---', '', `# ${title}`, '', '',
  ];
  return { filename: `${title}.md`, content: fields.join('\n') };
}
