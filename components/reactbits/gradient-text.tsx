// Adapted from React Bits GradientText: CSS-driven linear variant.
import type { ReactNode } from 'react';
export function GradientText({ children }: { children: ReactNode }) {
  return <span className="serif gradient-text">{children}</span>;
}
