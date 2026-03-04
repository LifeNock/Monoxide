'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Globe, Gamepad2, MessageCircle, Settings, User } from 'lucide-react';

const navItems = [
  { href: '/proxy', label: 'Proxy', icon: Globe },
  { href: '/games', label: 'Games', icon: Gamepad2 },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 220,
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
    }}>
      {/* Wordmark */}
      <Link href="/" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1.25rem 1rem',
        borderBottom: '1px solid var(--border)',
        textDecoration: 'none',
      }}>
        <Image src="/MonoxideLogo.png" alt="" width={32} height={32} />
        <span className="wordmark" style={{ fontSize: '1.3rem', color: 'var(--accent)' }}>
          MONOXIDE
        </span>
      </Link>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 0.75rem',
              borderRadius: 8,
              color: active ? 'var(--accent)' : 'var(--text-secondary)',
              background: active ? 'var(--accent-muted)' : 'transparent',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: active ? 600 : 400,
              transition: 'all 0.15s',
            }}>
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom profile link */}
      <div style={{
        padding: '0.75rem 0.5rem',
        borderTop: '1px solid var(--border)',
      }}>
        <Link href="/settings/profile" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.6rem 0.75rem',
          borderRadius: 8,
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          fontSize: '0.85rem',
        }}>
          <User size={18} />
          Profile
        </Link>
      </div>
    </aside>
  );
}
