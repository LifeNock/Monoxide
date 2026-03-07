'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

type Step = 1 | 2 | 3 | 4;

export default function SignupPage() {
  const [step, setStep] = useState<Step>(1);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [bio, setBio] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [newsletter, setNewsletter] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const checkUsername = async (value: string) => {
    if (value.length < 3) { setUsernameAvailable(null); return; }
    setUsernameChecking(true);
    try {
      const res = await fetch(`/api/username-check?username=${encodeURIComponent(value)}`);
      const data = await res.json();
      setUsernameAvailable(data.available);
    } catch { setUsernameAvailable(null); }
    setUsernameChecking(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password, username, displayName, bio, pronouns, newsletter,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Signup failed');
      setLoading(false);
      return;
    }

    // Show email confirmation message
    setShowConfirmation(true);
    setLoading(false);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return displayName && username && username.length >= 3 && usernameAvailable === true;
      case 2: return email && password && password === confirmPassword && password.length >= 6;
      case 3: return true;
      case 4: return true;
    }
  };

  if (showConfirmation) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
          <Image src="/MonoxideLogo.png" alt="Monoxide" width={48} height={48} />
        </div>
        <h1 className="wordmark" style={{
          fontSize: '1.8rem',
          background: 'linear-gradient(135deg, var(--gradient-1) 0%, var(--gradient-2) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Check your email
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          We sent a confirmation link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
          Click the link to activate your account.
        </p>
        <Link href="/login">
          <button className="btn-primary" style={{ width: '100%' }}>Go to Sign In</button>
        </Link>
      </div>
    );
  }

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
        <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem', fontSize: '0.85rem' }}>
          Step {step} of 4
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: s <= step ? 'var(--accent)' : 'var(--border)',
            transition: 'background 0.4s ease, box-shadow 0.4s',
            boxShadow: s <= step ? '0 0 8px var(--accent-muted)' : 'none',
          }} />
        ))}
      </div>

      {/* Step 1: Identity */}
      {step === 1 && (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Display Name</label>
            <input type="text" placeholder="What should we call you?" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Username</label>
            <input type="text" placeholder="your-unique-name" value={username}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                setUsername(val);
                checkUsername(val);
              }}
            />
            <div style={{ minHeight: 20, marginTop: 4, fontSize: '0.75rem' }}>
              {usernameChecking && <span style={{ color: 'var(--text-muted)' }}>Checking...</span>}
              {!usernameChecking && usernameAvailable === true && username.length >= 3 && (
                <span style={{ color: 'var(--success)' }}>Available</span>
              )}
              {!usernameChecking && usernameAvailable === false && (
                <span style={{ color: 'var(--danger)' }}>Taken</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Password + optional email */}
      {step === 2 && (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Password</label>
            <input type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Confirm Password</label>
            <input type="password" placeholder="Type it again" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            {password && confirmPassword && password !== confirmPassword && (
              <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 4, animation: 'fadeIn 0.2s' }}>Doesn&apos;t match</p>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Email
            </label>
            <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        </div>
      )}

      {/* Step 3: Avatar + Pronouns + Bio */}
      {step === 3 && (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              background: 'var(--bg-tertiary)', border: '2px solid var(--border)',
              transition: 'border-color 0.2s',
            }}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1.5rem', fontWeight: 700 }}>
                  {displayName?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div>
              <label className="btn-secondary" style={{ cursor: 'pointer', fontSize: '0.8rem', padding: '8px 16px', display: 'inline-block' }}>
                Upload Avatar
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 4 }}>Optional</p>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Pronouns</label>
            <select value={pronouns} onChange={(e) => setPronouns(e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="he/they">he/they</option>
              <option value="she/they">she/they</option>
              <option value="any">any pronouns</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Bio</label>
            <textarea placeholder="Tell us about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} rows={3} style={{ resize: 'vertical' }} />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>{bio.length}/200</p>
          </div>
        </div>
      )}

      {/* Step 4: Newsletter */}
      {step === 4 && (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
            padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 12,
            border: '1px solid var(--border)', transition: 'border-color 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
            <div>
              <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>Get updates</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>New features and games</p>
            </div>
          </label>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center' }}>
            You&apos;re all set. Ready to go?
          </p>
        </div>
      )}

      {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', animation: 'fadeIn 0.2s' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {step > 1 && (
          <button className="btn-secondary" onClick={() => setStep((s) => (s - 1) as Step)} style={{ flex: 1 }}>Back</button>
        )}
        {step < 4 ? (
          <button className="btn-primary" onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canProceed()} style={{ flex: 1 }}>Continue</button>
        ) : (
          <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        )}
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Already have an account?{' '}<Link href="/login" style={{ fontWeight: 600 }}>Sign in</Link>
      </p>
    </div>
  );
}
