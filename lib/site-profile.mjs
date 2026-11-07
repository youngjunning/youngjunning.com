import persona from '../content/persona.json' with { type: 'json' };

// Deployment identity is the adapter; product modules use the same fields.
export const siteProfile = {
  name: persona.name,
  siteName: persona.siteName,
  baseUrl: persona.domain,
  articlePath: '/blog',
  readerAccess: '通过本站公开接口读取已审核资料。',
  readerSourceUrl: 'https://github.com/youngjunning/skills',
  articleEmbedPrefixes: [],
  indexable: true,
  weeklyTags: [persona.siteName + '周刊', '数字分身周刊'],
  reader: {
    id: 'junning',
    name: 'junning',
    directory: 'silicon-junning',
    manifestUrl: '/skills/silicon-junning.json',
    archiveUrl: '/skills/silicon-junning.zip',
    catalogPath: '/api/skills',
  },
};

export function allowsArticleEmbed(src) {
  return typeof src === 'string' && siteProfile.articleEmbedPrefixes.some(prefix => src.startsWith(prefix) && /^[a-f0-9]{24}\.html$/.test(src.slice(prefix.length)));
}
