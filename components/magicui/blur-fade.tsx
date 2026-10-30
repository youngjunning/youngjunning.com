/* Adapted from Magic UI BlurFade, MIT. See THIRD_PARTY_NOTICES.md.
 * Adds reduced-motion support and a readable server-rendered initial state. */
'use client';
import { useRef, type ReactNode } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
export function BlurFade({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px' });
  const reduced = useReducedMotion();
  return <motion.div ref={ref} className={className} initial={false}
    animate={inView && !reduced ? { opacity: [0.6, 1], y: [8, 0], filter: ['blur(3px)', 'blur(0px)'] } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
    transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : delay, ease: 'easeOut' }}>{children}</motion.div>;
}
