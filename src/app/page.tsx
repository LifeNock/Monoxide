'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Globe, Gamepad2, MessageCircle, Shield, ArrowRight } from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';
import FunFact from '@/components/FunFact';

const features = [
  { icon: Globe, title: 'Web Tools', desc: 'Integrated browsing utilities' },
  { icon: Gamepad2, title: 'Activities', desc: 'Interactive apps and more' },
  { icon: MessageCircle, title: 'Discussions', desc: 'Real-time channels and groups' },
  { icon: Shield, title: 'Privacy', desc: 'Focus mode and privacy tools' },
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Check if user is logged in
    fetch('/api/auth/me').then(r => {
      if (r.ok) setIsLoggedIn(true);
    }).catch(() => {});
  }, []);

  const handleGetStarted = () => {
    router.push(isLoggedIn ? '/games' : '/signup');
  };

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
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
            animation: 'float 4s ease-in-out infinite',
          }}>
            <Image src="/monoxidelogo.png" alt="Monoxide" width={150} height={120} priority className="logo-adaptive" style={{ objectFit: 'contain' }} />
          </div>
        </div>

        {/* Title */}
        <h1 className={`wordmark ${mounted ? 'animate-in-up stagger-2' : ''}`} style={{
          fontSize: 'clamp(3rem, 8vw, 5rem)',
          fontWeight: 900,
          background: 'linear-gradient(135deg, var(--gradient-1) 0%, var(--gradient-2) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1.1,
          marginBottom: '0.75rem',
        }}>
          Monoxide
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
          All your tools, one place
        </p>

        {/* CTA buttons */}
        <div className={mounted ? 'animate-in-up stagger-4' : ''} style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: '4rem',
        }}>
          <button onClick={handleGetStarted} className="btn-primary" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '14px 28px',
            fontSize: '0.95rem',
            borderRadius: 12,
            cursor: 'pointer',
          }}>
            Get Started <ArrowRight size={16} />
          </button>
          {!isLoggedIn && (
            <Link href="/login">
              <button className="btn-secondary" style={{
                padding: '14px 28px',
                fontSize: '0.95rem',
                borderRadius: 12,
                cursor: 'pointer',
              }}>
                Sign In
              </button>
            </Link>
          )}
        </div>

        {/* Feature cards */}
        <div className={mounted ? 'animate-in-up stagger-5' : ''} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.75rem',
          maxWidth: 900,
          width: '100%',
          padding: '0 1rem',
        }}>
          {features.map((f) => (
            <div key={f.title} className="glass" style={{
              padding: '1.25rem',
              borderRadius: 14,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <f.icon size={22} style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }} />
              <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{f.title}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.4 }}>{f.desc}</p>
            </div>
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
