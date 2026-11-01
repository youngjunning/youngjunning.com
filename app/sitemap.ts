import type { MetadataRoute } from 'next';
import { getContent } from '@/lib/content';
export default function sitemap(): MetadataRoute.Sitemap { const { records, posts } = getContent(); return ['','/resume','/records','/blog','/blog/migration','/blog/website-migration','/favorites','/chat','/protocol','/skills','/graph','/wiki','/engineering','/okr','/manage', ...records.map(item => '/records/' + item.id), ...posts.map(item => '/blog/' + item.id)].map(route => ({ url: 'https://youngjunning.com' + route })); }
