/* Adapted from Magic UI BentoGrid/BentoCard, MIT. See THIRD_PARTY_NOTICES.md.
 * Uses a semantic full-card link, responsive sizing, and keyboard focus. */
import { SpotlightCard } from '@/components/reactbits/spotlight-card';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
export function BentoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('bento-grid', className)}>{children}</div>;
}
export function BentoCard({ title, description, href, className, children, label }: { title: string; description: string; href: string; className?: string; children?: ReactNode; label: string }) {
  return <SpotlightCard href={href} className={cn('bento-card group', className)}>
    <div className="card-top"><span className="eyebrow">{label}</span><ArrowUpRight size={20} className="card-arrow" /></div>
    {children}<div className="card-bottom"><h3>{title}</h3><p>{description}</p></div>
  </SpotlightCard>;
}
