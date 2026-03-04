'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Globe, Gamepad2, MessageCircle, Shield, ArrowRight } from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';
import FunFact from '@/components/FunFact';

const features = [
  { icon: Globe, title: 'Web Proxy', desc: 'Dual-engine browsing with Ultraviolet & Scramjet', href: '/proxy' },
  { icon: Gamepad2, title: 'Games', desc: '35+ curated browser games, zero downloads', href: '/games' },
  { icon: MessageCircle, title: 'Chat', desc: 'Real-time channels with custom emojis & roles', href: '/chat' },
  { icon: Shield, title: 'Stealth', desc: 'Panic key, tab cloaking, and privacy tools', href: '/settings/privacy' },
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <ParticleBackground />

      {/* Hero */}
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div className={mounted ? 'animate-in-up stagger-1' : ''} style={{
          marginBottom: '1.5rem',
          animation: mounted ? undefined : 'none',
        }}>
          <div style={{
            width: 90,
            height: 90,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
            animation: 'float 4s ease-in-out infinite',
          }}>
            <Image src="/MonoxideLogo.png" alt="Monoxide" width={64} height={64} priority />
          </div>
        </div>

        {/* Title */}
        <h1 className={`wordmark ${mounted ? 'animate-in-up stagger-2' : ''}`} style={{
          fontSize: 'clamp(3rem, 8vw, 5rem)',
          fontWeight: 900,
          background: 'linear-gradient(135deg, #FFFFFF 0%, #666666 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1.1,
          marginBottom: '0.75rem',
        }}>
          MONOXIDE
        </h1>

        {/* Tagline */}
        <p className={mounted ? 'animate-in-up stagger-3' : ''} style={{
          color: 'var(--text-secondary)',
          fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
          textAlign: 'center',
          maxWidth: 460,
          marginBottom: '2.5rem',
          fontWeight: 300,
          letterSpacing: '0.02em',
        }}>
          The all-in-one unblocked platform
        </p>

        {/* CTA buttons */}
        <div className={mounted ? 'animate-in-up stagger-4' : ''} style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: '4rem',
        }}>
          <Link href="/proxy">
            <button className="btn-primary" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '14px 28px',
              fontSize: '0.95rem',
              borderRadius: 12,
            }}>
              Get Started <ArrowRight size={16} />
            </button>
          </Link>
          <Link href="/signup">
            <button className="btn-secondary" style={{
              padding: '14px 28px',
              fontSize: '0.95rem',
              borderRadius: 12,
            }}>
              Create Account
            </button>
          </Link>
        </div>

        {/* Feature cards */}
        <div className={mounted ? 'animate-in-up stagger-5' : ''} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
          maxWidth: 900,
          width: '100%',
          padding: '0 1rem',
        }}>
          {features.map((f, i) => (
            <Link key={f.title} href={f.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="glass" style={{
                padding: '1.25rem',
                borderRadius: 14,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                position: 'relative',
                overflow: 'hidden',
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <f.icon size={22} style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }} />
                <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{f.title}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.4 }}>{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Fun fact at bottom */}
        <div style={{ marginTop: '3rem', opacity: 0.6 }}>
          <FunFact />
        </div>
      </div>
    </div>
  );
}
