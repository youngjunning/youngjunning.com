import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const root = process.cwd();
const report = JSON.parse(fs.readFileSync(path.join(root, 'content/soft-skills.json'), 'utf8'));
const records = JSON.parse(fs.readFileSync(path.join(root, 'content/records.json'), 'utf8')).records;
const sources = new Map(records.filter(item => item.visibility === 'shared').map(item => [`record-${item.id}`, {
  title: item.title, url: `/records/${item.id}`, text: `${item.text}\n${item.context}`,
}]));
for (const name of fs.readdirSync(path.join(root, 'content/posts')).filter(item => item.endsWith('.md'))) {
  const { data, content } = matter(fs.readFileSync(path.join(root, 'content/posts', name), 'utf8'));
  if (data.id && !data.draft && data.visibility !== 'private') sources.set(`blog-${data.id}`, {
    title: data.title, url: `/blog/${data.id}`, text: `${data.description}\n${content}`,
  });
}
const ensure = (condition, message) => { if (!condition) throw new Error(`Soft skills: ${message}`); };
const filled = value => typeof value === 'string' && value.trim().length > 0;
ensure(report.version === 1 && /^\d{4}-\d{2}-\d{2}$/.test(report.assessedAt) && filled(report.model), 'version, date or model is invalid');
ensure(filled(report.sourceDigest) && Number.isInteger(report.sourceCount) && report.sourceCount > 0, 'source snapshot is invalid');
ensure(filled(report.summary) && filled(report.limitations), 'summary or limitations is missing');
ensure(Array.isArray(report.areas) && report.areas.length > 0 && report.areas.length <= 3, 'areas must contain one to three items');
const ids = new Set();
for (const area of report.areas) {
  ensure(filled(area.id) && !ids.has(area.id), 'area ID is missing or duplicated');
  ids.add(area.id);
  ensure(filled(area.name) && filled(area.assessment) && ['strong', 'moderate', 'limited'].includes(area.evidenceStrength), `invalid area ${area.id}`);
  ensure(Array.isArray(area.recommendations) && area.recommendations.length > 0 && area.recommendations.every(filled) && filled(area.nextEvidence), `missing growth path for ${area.id}`);
  ensure(Array.isArray(area.evidence) && area.evidence.length > 0 && area.evidence.length <= 3, `invalid evidence for ${area.id}`);
  const cited = new Set();
  for (const evidence of area.evidence) {
    const source = sources.get(evidence.sourceId);
    ensure(source && !cited.has(evidence.sourceId), `missing or repeated source ${evidence.sourceId}`);
    cited.add(evidence.sourceId);
    ensure(evidence.title === source.title && evidence.url === source.url && filled(evidence.reason) && filled(evidence.quote) && source.text.includes(evidence.quote), `unverifiable citation ${evidence.sourceId}`);
  }
}
console.log(`Soft skills valid: ${report.areas.length} areas, ${new Set(report.areas.flatMap(area => area.evidence.map(item => item.sourceId))).size} cited sources.`);
