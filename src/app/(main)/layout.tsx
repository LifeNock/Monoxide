'use client';

import Sidebar from '@/components/Sidebar';
import { usePanicKey, getIsPanicking } from '@/hooks/usePanicKey';
import { useEffect } from 'react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  usePanicKey();

  useEffect(() => {
    // Track intentional refreshes so we don't prompt for those
    let isRefreshing = false;

    const keyHandler = (e: KeyboardEvent) => {
      // F5 or Ctrl+R / Cmd+R = refresh, not a tab close
      if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
        isRefreshing = true;
      }
    };

    // Beforeunload confirmation — only on actual tab close
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (getIsPanicking()) return;
      if (isRefreshing) { isRefreshing = false; return; }
      // Skip prompt during fullscreen game — keyboard.lock handles key blocking
      if ((window as any).__monoxide_game_fullscreen) return;
      e.preventDefault();
    };

    window.addEventListener('keydown', keyHandler, { capture: true });
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('keydown', keyHandler, { capture: true });
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: 220, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <main style={{ flex: 1, padding: '1.5rem', overflow: 'auto', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
