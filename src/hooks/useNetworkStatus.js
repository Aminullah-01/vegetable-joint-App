import { useState, useEffect } from 'react';
import { networkStatus } from '../services/networkStatus.js';

/**
 * Custom React hook for tracking real-time network connectivity.
 * Conforms to SRS NFR-REL-05.
 *
 * @returns {{
 *   isOnline: boolean,
 *   isOffline: boolean,
 *   wasOffline: boolean,
 * }}
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => networkStatus.isOnline());
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = networkStatus.subscribe((online) => {
      setIsOnline((prev) => {
        if (!prev && online) {
          setWasOffline(true);
        }
        return online;
      });
    });

    return unsubscribe;
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
  };
}

export default useNetworkStatus;
