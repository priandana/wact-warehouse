'use client';
// components/shared/layout/NavigationProgressBar.tsx
// Ultra-smooth, zero-dependency route transition progress bar for Next.js App Router

import { useEffect, useState, useRef, useTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Complete progress bar when route transition finishes (pathname or searchParams change)
  useEffect(() => {
    if (isVisible) {
      setProgress(100);
      const fadeTimer = setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 250);

      return () => clearTimeout(fadeTimer);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const startProgress = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

      setIsVisible(true);
      setProgress(15);

      // Smooth step increments simulating active network fetching
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev < 60) return prev + Math.random() * 18 + 8;
          if (prev < 85) return prev + Math.random() * 6 + 2;
          if (prev < 94) return prev + 0.5;
          return prev;
        });
      }, 180);

      // Safety timeout: automatically cleanup if route takes too long or fails
      safetyTimeoutRef.current = setTimeout(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(100);
        setTimeout(() => {
          setIsVisible(false);
          setProgress(0);
        }, 200);
      }, 8000);
    };

    const handleAnchorClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a') as HTMLAnchorElement | null;

      if (!anchor) return;

      const href = anchor.getAttribute('href');
      const targetAttr = anchor.getAttribute('target');

      // Ignore if not standard navigation
      if (!href) return;
      if (href.startsWith('#')) return;
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
      if (targetAttr === '_blank') return;
      if (anchor.hasAttribute('download')) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;

      try {
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(href, window.location.href);

        // Ignore external navigation or same exact pathname & search
        if (targetUrl.origin !== currentUrl.origin) return;
        if (targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search) {
          return;
        }

        startProgress();
      } catch {
        // Fallback for relative paths
        if (href.startsWith('/') && href !== window.location.pathname) {
          startProgress();
        }
      }
    };

    const handlePopState = () => {
      startProgress();
    };

    document.addEventListener('click', handleAnchorClick, { capture: true });
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleAnchorClick, { capture: true });
      window.removeEventListener('popstate', handlePopState);
      if (timerRef.current) clearInterval(timerRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, []);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[2.5px] bg-transparent overflow-hidden"
    >
      <div
        className="h-full bg-blue-600 shadow-[0_0_10px_#2563eb,0_0_5px_#3b82f6] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? '150ms' : '220ms',
          opacity: isVisible ? 1 : 0,
        }}
      />
    </div>
  );
}
