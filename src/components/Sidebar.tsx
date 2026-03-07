'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Globe, Gamepad2, MessageCircle, Settings, User, LogOut } from 'lucide-react';

const navItems = [
  { href: '/proxy', label: 'Proxy', icon: Globe },
  { href: '/games', label: 'Games', icon: Gamepad2 },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [navigating, setNavigating] = useState<string | null>(null);

  useEffect(() => {
    setNavigating(null);
  }, [pathname]);

  const handleNav = (href: string) => {
    if (pathname.startsWith(href)) return;
    setNavigating(href);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

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
      <Link href="/" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1.25rem 1rem',
        borderBottom: '1px solid var(--border)',
        textDecoration: 'none',
      }}>
        <div style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: 'var(--logo-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Image src="/MonoxideLogo.png" alt="" width={32} height={32} />
        </div>
        <span className="wordmark" style={{
          fontSize: '1.15rem',
          background: 'linear-gradient(135deg, var(--gradient-1) 0%, var(--gradient-2) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          MONOXIDE
        </span>
      </Link>

      <nav style={{ flex: 1, padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map(({ href, label, icon: Icon }, i) => {
          const active = pathname.startsWith(href);
          const loading = navigating === href;
          return (
            <Link key={href} href={href} onClick={() => handleNav(href)} className={`animate-in stagger-${i + 1}`} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 0.75rem',
              borderRadius: 10,
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: active ? 'var(--accent-muted)' : 'transparent',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: active ? 600 : 400,
              transition: 'all 0.2s',
              position: 'relative',
            }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? 'var(--accent-muted)' : 'transparent'; }}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              {label}
              {loading && <div className="nav-spinner" />}
              {active && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 3,
                  height: 16,
                  borderRadius: 2,
                  background: 'var(--accent)',
                }} />
              )}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '0.5rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <Link href="/settings/profile" style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem',
          borderRadius: 10, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem',
          transition: 'all 0.2s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <User size={16} /> Profile
        </Link>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem',
          borderRadius: 10, color: 'var(--text-muted)', fontSize: '0.82rem', background: 'none',
          width: '100%', textAlign: 'left', transition: 'all 0.2s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
        >
          <LogOut size={16} /> Log out
        </button>
      </div>
    </aside>
  );
}
