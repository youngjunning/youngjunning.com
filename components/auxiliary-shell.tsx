import type { ReactNode } from 'react';
import Shell from '@/components/shell';
import StatechartShell from '@/components/statechart/shell';
import { getSiteTheme } from '@/lib/site-theme';
import type { SiteSection } from '@/lib/site-navigation';
import './auxiliary-shell.css';

export default async function AuxiliaryShell({ children, title, active = 'library', prose = true }: { children: ReactNode; title: string; active?: SiteSection; prose?: boolean }) {
  const content = <div className={`auxiliary-content${prose ? ' prose' : ''}`}>{children}</div>;
  if (await getSiteTheme() === 'statechart') return <StatechartShell active={active === 'library' ? '/blog' : `/${active}`} title={title} subtitle="保留资料的原始来源与适用范围。">{content}</StatechartShell>;
  return <Shell active={active}>{content}</Shell>;
}
