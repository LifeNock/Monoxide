'use client';

import { useEffect } from 'react';

export default function FingerprintCollector() {
  useEffect(() => {
    const collect = async () => {
      try {
        const FingerprintJS = (await import('@fingerprintjs/fingerprintjs')).default;
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const visitorId = result.visitorId;

        // Only send if we have a valid fingerprint
        if (visitorId) {
          await fetch('/api/fingerprint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint: visitorId }),
          });
        }
      } catch {
        // Silent fail — fingerprinting is best-effort
      }
    };

    collect();
  }, []);

  return null;
}
