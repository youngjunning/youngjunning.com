import type { Metadata } from 'next';
import { siteProfile } from '@/lib/site-profile.mjs';
import './globals.css';
import './typography.css';
import '@/components/statechart/theme.css';
import { getSiteTheme } from '@/lib/site-theme';
import persona from '@/lib/persona';
export const metadata: Metadata = {
  title: { default: persona.siteName, template: '%s · ' + persona.siteName },
  metadataBase: new URL(siteProfile.baseUrl),
  description: persona.intro,
  robots: { index: siteProfile.indexable, follow: siteProfile.indexable },
};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = await getSiteTheme();
  return <html lang="zh-CN" data-theme={theme} data-style="mint" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{var s=localStorage.getItem('zisheng-visual-style');s=['mint','violet','paper'].includes(s)?s:'mint';document.documentElement.dataset.style=s;localStorage.setItem('zisheng-visual-style',s)}catch(e){}" }} /></head><body>{children}</body></html>;
}
