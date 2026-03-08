'use client';

import { useSearchParams } from 'next/navigation';
import { Ban, Clock, Fingerprint, Globe } from 'lucide-react';
import { Suspense } from 'react';

function BannedContent() {
  const params = useSearchParams();
  const type = params.get('type') || 'permanent';
  const reason = params.get('reason') || '';
  const expires = params.get('expires');

  const typeInfo: Record<string, { icon: any; label: string; color: string }> = {
    permanent: { icon: Ban, label: 'Permanently Banned', color: '#ef4444' },
    temporary: { icon: Clock, label: 'Temporarily Suspended', color: '#f59e0b' },
    hwid: { icon: Fingerprint, label: 'Device Banned', color: '#dc2626' },
    ip: { icon: Globe, label: 'IP Banned', color: '#b91c1c' },
  };

  const info = typeInfo[type] || typeInfo.permanent;
  const Icon = info.icon;
  const expiryDate = expires ? new Date(expires) : null;
  const timeLeft = expiryDate ? getTimeRemaining(expiryDate) : null;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: 440,
        width: '100%',
        textAlign: 'center',
        animation: 'fadeInUp 0.4s ease',
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `${info.color}15`,
          border: `2px solid ${info.color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <Icon size={36} style={{ color: info.color }} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          {info.label}
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Your access to Monoxide<sup style={{ fontSize: '0.6em' }}>™</sup> has been restricted.
          {type === 'temporary' && ' This is a temporary suspension.'}
        </p>

        {reason && (
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
            textAlign: 'left',
          }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Reason
            </p>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
              {reason}
            </p>
          </div>
        )}

        {expiryDate && timeLeft && (
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
          }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Access restored in
            </p>
            <p style={{ color: '#f59e0b', fontSize: '1.1rem', fontWeight: 700 }}>
              {timeLeft}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
              {expiryDate.toLocaleString()}
            </p>
          </div>
        )}

        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '1rem', lineHeight: 1.5 }}>
          If you believe this was a mistake, contact a moderator or administrator.
        </p>
      </div>
    </div>
  );
}

function getTimeRemaining(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(' ') || '< 1m';
}

export default function BannedPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    }>
      <BannedContent />
    </Suspense>
  );
}
