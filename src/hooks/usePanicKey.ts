'use client';

import { useEffect } from 'react';

// Global flag so beforeunload knows to skip confirmation on panic
let isPanicking = false;
export function getIsPanicking() { return isPanicking; }

export function usePanicKey() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const panicKey = localStorage.getItem('monoxide-panic-key') || '`';
      const panicUrl = localStorage.getItem('monoxide-panic-url') || 'https://www.google.com';

      if (e.key === panicKey) {
        e.preventDefault();
        e.stopPropagation();
        isPanicking = true;

        // Immediately nuke the page HTML so nothing is visible
        document.documentElement.innerHTML = '';
        document.title = '';

        // Clear favicon
        const link = document.querySelector("link[rel*='icon']");
        if (link) link.remove();

        // Redirect
        window.location.replace(panicUrl);
      }
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, []);
}
