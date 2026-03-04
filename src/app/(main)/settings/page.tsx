'use client';

import Link from 'next/link';
import { Palette, User, Shield, Users } from 'lucide-react';

const settingsLinks = [
  { href: '/settings/appearance', label: 'Appearance', desc: 'Theme, font, and visual preferences', icon: Palette },
  { href: '/settings/profile', label: 'Profile', desc: 'Display name, avatar, bio, pronouns', icon: User },
  { href: '/settings/privacy', label: 'Privacy', desc: 'Panic key, cloaking, DM settings', icon: Shield },
  { href: '/settings/admin/roles', label: 'Role Management', desc: 'Create and manage user roles', icon: Users },
];

export default function SettingsPage() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem' }}>Settings</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {settingsLinks.map(({ href, label, desc, icon: Icon }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: 'var(--accent-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
              }}>
                <Icon size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 600 }}>{label}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
