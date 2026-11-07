import type { MetadataRoute } from 'next';
import { getContent } from '@/lib/content';
import { siteProfile } from '@/lib/site-profile.mjs';
export default function sitemap(): MetadataRoute.Sitemap {
  const { records, posts } = getContent();
  const routes = ['', '/resume', '/records', '/blog', '/blog/migration', '/blog/website-migration', '/favorites', '/chat', '/protocol', '/skills', '/skills/matt', '/graph', '/wiki', '/engineering', '/agent', ...records.map(item => '/records/' + item.id), ...posts.map(item => '/blog/' + item.id)];
  return routes.map(route => ({ url: siteProfile.baseUrl + route }));
}
