'use client';

import { useEffect } from 'react';

export function usePanicKey() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const panicKey = localStorage.getItem('monoxide-panic-key') || '`';
      const panicUrl = localStorage.getItem('monoxide-panic-url') || 'https://www.google.com';

      if (e.key === panicKey) {
        e.preventDefault();
        window.location.href = panicUrl;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
