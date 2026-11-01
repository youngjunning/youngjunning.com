import { BookOpen, Sprout, WandSparkles } from 'lucide-react';

export function MagicBook({ compact = false }: { compact?: boolean }) {
  return <div className={`magic-book${compact ? ' magic-book-compact' : ''}`} aria-hidden="true">
    <span className="magic-book-glow" />
    <Sprout className="magic-book-sprout" strokeWidth={1} />
    <BookOpen className="magic-book-pages" strokeWidth={0.85} />
    <WandSparkles className="magic-book-wand" strokeWidth={1.2} />
    <span className="magic-mote mote-one" /><span className="magic-mote mote-two" /><span className="magic-mote mote-three" />
  </div>;
}
