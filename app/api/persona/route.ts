import persona from '@/lib/persona';
import { getCatalog } from '@/lib/content';
import { getJourneyRecords, getRecords } from '@/lib/records';

export const dynamic = 'force-static';
export function GET() {
  const catalog = getCatalog();
  const records = getRecords();
  const projects = records.filter((record) => record.kind === 'project');
  const ids = new Set([persona.principle?.articleId, ...projects.map((project) => project.articleId), ...persona.perspectives.map((view) => view.articleId), ...persona.featuredArticleIds]);
  return Response.json({ ...persona, recordsUrl: '/api/records', projects: projects.map((record) => ({ name: record.title, label: record.label, description: record.text, role: record.role, tags: record.tags, articleId: record.articleId, recordId: record.id, url: `/records/${record.id}` })), journey: getJourneyRecords(records).map((record) => ({ period: record.period, title: record.title, detail: record.text, recordId: record.id })), evidence: catalog.documents.filter((doc) => ids.has(doc.id)).map(({ id, title, url, rawUrl }) => ({ id, title, url, rawUrl })) });
}
