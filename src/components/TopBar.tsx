'use client';

import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/proxy': 'Monoxide Proxy',
  '/games': 'Monoxide Games',
  '/chat': 'Monoxide Chat',
  '/settings': 'Settings',
  '/settings/profile': 'Profile Settings',
  '/settings/appearance': 'Appearance',
  '/settings/privacy': 'Privacy',
  '/settings/admin/roles': 'Role Management',
};

export default function TopBar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || '';

  return (
    <header style={{
      height: 56,
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1.5rem',
    }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>{title}</h2>
    </header>
  );
}
