import { siteProfile } from '@/lib/site-profile.mjs';
import { getSiteTheme } from '@/lib/site-theme';
import { StatechartOkr } from '@/components/statechart/pages';
import type { Metadata } from 'next';
import Shell from '@/components/shell';
import OkrDashboard from '@/components/lucian/okr-dashboard';
import { getOkrStore } from '@/lib/okr';

export const metadata: Metadata = { title: 'OKR', description: `${siteProfile.name}的季度目标、关键结果与月报素材。` };

export default async function OkrPage() {
  if (await getSiteTheme() === 'statechart') return <StatechartOkr />;
  return <Shell active="okr"><OkrDashboard store={getOkrStore()} /></Shell>;
}
