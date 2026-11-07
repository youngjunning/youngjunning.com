import { redirect } from 'next/navigation';
import { articleFilters, articleHref } from '@/lib/article-navigation.mjs';
export default async function LibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = articleFilters(await searchParams);
  redirect(articleHref(filters));
}
