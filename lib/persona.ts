import source from '@/content/persona.json';
import records from '@/content/records.json';

type Perspective = { title: string; description: string; articleId: string };
// Public selections are derived only from the public repository's reviewed data.
const shared = records.records.filter(record => record.visibility === 'shared');
const persona = {
  ...source,
  intro: source.bio,
  principle: null as { title: string; text: string; articleId: string } | null,
  siteSubtitle: `${source.name}的数字分身`,
  featuredExperienceIds: shared.filter(record => record.kind === 'experience').map(record => record.id),
  featuredProjectIds: shared.filter(record => record.kind === 'project').map(record => record.id),
  featuredArticleIds: [] as string[],
  valueRecordIds: source.valueRecordIds,
  perspectives: [] as Perspective[],
};
export default persona;
