'use client';

import Link from 'next/link';
import { Palette, User, Shield, Users } from 'lucide-react';

const settingsLinks = [
  { href: '/settings/appearance', label: 'Appearance', desc: 'Theme, font, and visual preferences', icon: Palette },
  { href: '/settings/profile', label: 'Profile', desc: 'Display name, avatar, bio, pronouns', icon: User },
  { href: '/settings/privacy', label: 'Privacy', desc: 'Panic key, cloaking, DM settings', icon: Shield },
  { href: '/settings/admin/roles', label: 'Roles', desc: 'Create and manage user roles', icon: Users },
];

export default function SettingsPage() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 className="animate-in" style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem' }}>Settings</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {settingsLinks.map(({ href, label, desc, icon: Icon }, i) => (
          <Link key={href} href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className={`card animate-in stagger-${i + 1}`} style={{
              display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'var(--accent-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}>
                <Icon size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{desc}</p>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>&#8250;</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
