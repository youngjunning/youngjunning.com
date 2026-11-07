import { topicIds } from './topics.mjs';
import { validContentTime } from './content-time.mjs';

/** @param {{title: string, topic: string, collection?: string, id: string, date: string}} input */
export function articleDraft({ title, topic, collection, id, date }) {
  title = title.trim();
  if (!title || title.length > 100 || /[\x00-\x1f/\\]/.test(title) || title === '.' || title === '..' || /^(README|AGENTS|MIGRATION)$/i.test(title)) throw new Error('标题需为 1–100 字，不能含换行、路径分隔符或使用保留名称');
  if (!topicIds.includes(topic)) throw new Error('请选择有效的文章主题');
  if (collection !== undefined && !['docs','ata'].includes(collection)) throw new Error('请选择文章与观点或 ATA');
  if (!/^[a-f0-9]{16}$/.test(id)) throw new Error('文章 ID 格式不正确');
  if (!validContentTime(date)) throw new Error('创建时间格式不正确');
  const fields = [
    '---', `id: ${JSON.stringify(id)}`, `title: ${JSON.stringify(title)}`,
    `date: ${JSON.stringify(date)}`, 'updatedAt: null', 'description: ""', `topic: ${topic}`,
    'tags: []', ...(collection ? [`collection: ${collection}`] : []), 'draft: true',
    ...(collection === 'ata' ? ['publication:', '  status: draft'] : []),
    '---', '', `# ${title}`, '', '',
  ];
  return { filename: `${title}.md`, content: fields.join('\n') };
}
