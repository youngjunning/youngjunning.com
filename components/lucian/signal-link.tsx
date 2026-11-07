// Lucian UX/UI Prompt #009 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#009
import Link from 'next/link';
import type { CSSProperties } from 'react';
import './lucian-009.css';
import './signal-link.css';

export default function SignalLink({ href, label, download }: { href: string; label: string; download?: string }) {
  return <div className="ux u009 signal-link"><Link href={href} download={download} prefetch={download ? false : undefined} className="u009-btn"><span className="u009-fill" aria-hidden="true" /><span className="u009-word" aria-hidden="true"><span className="u009-face">{Array.from(label).map((char,index) => <span key={index} data-c={char} style={{'--i':index} as CSSProperties}>{char}</span>)}</span></span><span className="u009-sr">{label}</span><span className="u009-orb" aria-hidden="true">{[0,1].map((index) => <svg key={index} viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8" /></svg>)}</span></Link></div>;
}
