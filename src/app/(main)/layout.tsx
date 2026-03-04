'use client';

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { usePanicKey } from '@/hooks/usePanicKey';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  usePanicKey();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: 220, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TopBar />
        <main style={{ flex: 1, padding: '1.5rem', overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
