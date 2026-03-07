'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { clearSettingsCache } from '@/lib/settingsSync';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/proxy';

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnconfirmedEmail(null);
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.code === 'EMAIL_NOT_CONFIRMED') {
        setUnconfirmedEmail(data.email);
      } else {
        setError(data.error || 'Login failed');
      }
      setLoading(false);
      return;
    }

    clearSettingsCache();
    router.push(redirect);
    router.refresh();
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !unconfirmedEmail) return;
    setResendStatus(null);

    const res = await fetch('/api/auth/resend-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: unconfirmedEmail }),
    });

    if (res.ok) {
      setResendStatus('Confirmation email sent!');
      setResendCooldown(60);
    } else {
      const data = await res.json();
      setResendStatus(data.error || 'Failed to send');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <Image src="/MonoxideLogo.png" alt="Monoxide" width={48} height={48} />
        </div>
        <h1 className="wordmark" style={{
          fontSize: '1.8rem',
          background: 'linear-gradient(135deg, var(--gradient-1) 0%, var(--gradient-2) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          MONOXIDE
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem', fontSize: '0.85rem' }}>Welcome back</p>
      </div>

      {unconfirmedEmail ? (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '0.75rem',
          padding: '1rem', borderRadius: 8,
          background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
            Please confirm your email
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            We sent a confirmation link to <strong style={{ color: 'var(--text-primary)' }}>{unconfirmedEmail}</strong>.
            Check your inbox and click the link to activate your account.
          </p>
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="btn-primary"
            style={{ opacity: resendCooldown > 0 ? 0.5 : 1 }}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Confirmation Email'}
          </button>
          {resendStatus && (
            <p style={{
              fontSize: '0.75rem', textAlign: 'center',
              color: resendStatus.includes('sent') ? 'var(--accent)' : 'var(--danger)',
            }}>
              {resendStatus}
            </p>
          )}
          <button
            onClick={() => { setUnconfirmedEmail(null); setResendStatus(null); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'underline',
            }}
          >
            Back to login
          </button>
        </div>
      ) : (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input type="text" placeholder="Email or Username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', animation: 'fadeIn 0.2s ease-out' }}>{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.25rem' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      )}

      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" style={{ fontWeight: 600 }}>Sign up</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
