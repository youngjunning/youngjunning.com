import { siteProfile } from '@/lib/site-profile.mjs';
import { getSiteTheme } from '@/lib/site-theme';
import { StatechartBlog } from '@/components/statechart/pages';
import { getCatalog } from '@/lib/content';
import Library from '@/components/library';
import { articleFilters } from '@/lib/article-navigation.mjs';

export const metadata = { title: `${siteProfile.name}的手记` };
export default async function BlogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const filters = articleFilters(params);
  if (await getSiteTheme() === 'statechart') return <StatechartBlog query={filters.query} topic={filters.topic} tag={filters.tag} />;
  const catalog = getCatalog();
  const key = JSON.stringify(filters);
  return <Library key={key} catalog={catalog} initialFilters={filters} />;
}
