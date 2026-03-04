'use client';

import ParticleBackground from '@/components/ParticleBackground';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <ParticleBackground />
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        zIndex: 1,
      }}>
        <div className="glass animate-in-up" style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 20,
          padding: '2rem',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
