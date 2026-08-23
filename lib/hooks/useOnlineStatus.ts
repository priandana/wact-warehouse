// lib/hooks/useOnlineStatus.ts
// Detects online/offline status and triggers sync queue flush on reconnect.

'use client';

import { useEffect, useState, useCallback } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Calls onReconnect when the browser goes from offline → online.
 * Does NOT call on initial mount if already online.
 */
export function useReconnect(onReconnect: () => void) {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const stable = useCallback(onReconnect, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setWasOffline(false);
      stable();
    }
  }, [isOnline, wasOffline, stable]);
}
