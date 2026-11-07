import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';

export const getSiteTheme = cache(async () => (await cookies()).get('zisheng-site-theme')?.value === 'statechart' ? 'statechart' : 'classic');
