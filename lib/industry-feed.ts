export type IndustryItem = {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  publishedAt: string | null;
  category: string | null;
  itemUrl: string;
  originalUrl: string | null;
};

export type IndustryFeed = { state: 'unconfigured' | 'unavailable' | 'ready'; items: IndustryItem[]; homeUrl: string | null };

function publicUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export async function getIndustryFeed(): Promise<IndustryFeed> {
  const configured = publicUrl(process.env.INDUSTRY_FEED_ORIGIN);
  if (!configured) return { state: 'unconfigured', items: [], homeUrl: null };
  const origin = new URL(configured).origin;
  try {
    const response = await fetch(`${origin}/api/v1/items?mode=selected&window=7d&by=published&limit=12`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Industry feed returned ${response.status}`);
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('items' in body) || !Array.isArray(body.items)) throw new Error('Invalid industry feed');
    const items = body.items.flatMap((raw): IndustryItem[] => {
      if (!raw || typeof raw !== 'object') return [];
      const item = raw as Record<string, unknown>;
      const links = item.links && typeof item.links === 'object' ? item.links as Record<string, unknown> : {};
      const itemUrl = publicUrl(links.aihot);
      if (typeof item.id !== 'string' || typeof item.title !== 'string' || !item.title.trim() || !itemUrl || new URL(itemUrl).origin !== origin) return [];
      const source = item.source && typeof item.source === 'object' ? (item.source as Record<string, unknown>).name : null;
      return [{
        id: item.id,
        title: item.title,
        summary: typeof item.summary === 'string' ? item.summary : null,
        source: typeof source === 'string' ? source : '原始来源',
        publishedAt: typeof item.publishedAt === 'string' ? item.publishedAt : null,
        category: typeof item.category === 'string' ? item.category : null,
        itemUrl,
        originalUrl: publicUrl(links.original),
      }];
    });
    return { state: 'ready', items, homeUrl: origin };
  } catch {
    return { state: 'unavailable', items: [], homeUrl: origin };
  }
}
