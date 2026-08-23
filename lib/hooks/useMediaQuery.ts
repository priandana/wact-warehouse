// lib/hooks/useMediaQuery.ts
// Responsive breakpoint detection for conditional rendering (mobile vs desktop).

'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** Returns true when viewport ≥ 768px (tablet/desktop) */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)');
}

/** Returns true when viewport < 768px (mobile) */
export function useIsMobile(): boolean {
  return !useIsDesktop();
}
