import { getSiteTheme } from '@/lib/site-theme';
import { StatechartGraph } from '@/components/statechart/pages';
import KnowledgeGraph from '@/components/knowledge-graph';
import { getCatalog, getGraph } from '@/lib/content';
export const metadata = { title: '引用图谱' };
export default async function GraphPage({ searchParams }: { searchParams: Promise<{ doc?: string }> }) {
  if (await getSiteTheme() === 'statechart') return <StatechartGraph doc={(await searchParams).doc} />;
  return <KnowledgeGraph catalog={getCatalog()} graph={getGraph()} initialDoc={(await searchParams).doc} />;
}
