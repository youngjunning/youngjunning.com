import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';

export const getSiteTheme = cache(async () => {
  const value = (await cookies()).get('zisheng-site-theme')?.value;
  return ['statechart', 'xiaoxiang', 'qingshan', 'westlake', 'maldives'].includes(value || '') ? value : 'classic';
});
