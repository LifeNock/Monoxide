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

        // Store locally for socket identification
        if (visitorId) {
          localStorage.setItem('monoxide-hwid', visitorId);
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
