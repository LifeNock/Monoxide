'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

type Step = 1 | 2 | 3 | 4;

export default function SignupPage() {
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
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
    if (value.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setUsernameChecking(true);
    try {
      const res = await fetch(`/api/username-check?username=${encodeURIComponent(value)}`);
      const data = await res.json();
      setUsernameAvailable(data.available);
    } catch {
      setUsernameAvailable(null);
    }
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

    const supabase = createClient();

    // 1. Sign up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setError('Signup failed');
      setLoading(false);
      return;
    }

    // 2. Upload avatar if provided
    let avatarUrl = '';
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }
    }

    // 3. Create profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      username,
      display_name: displayName,
      avatar_url: avatarUrl,
      bio,
      pronouns,
      banner_color: '#FFD700',
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    // 4. Newsletter opt-in
    if (newsletter) {
      await supabase.from('newsletter_emails').insert({
        email,
        user_id: userId,
      });
    }

    router.push('/proxy');
    router.refresh();
  };

  const canProceed = () => {
    switch (step) {
      case 1: return email && password && password === confirmPassword && password.length >= 6;
      case 2: return displayName && username && username.length >= 3 && usernameAvailable === true;
      case 3: return true; // all optional
      case 4: return true;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ textAlign: 'center' }}>
        <Image src="/MonoxideLogo.png" alt="Monoxide" width={64} height={64} style={{ margin: '0 auto 1rem' }} />
        <h1 className="wordmark" style={{ fontSize: '2rem', color: 'var(--accent)' }}>MONOXIDE</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Create your account — Step {step} of 4</p>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            style={{
              width: 32,
              height: 4,
              borderRadius: 2,
              background: s <= step ? 'var(--accent)' : 'var(--bg-tertiary)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      {/* Step 1: Email + Password */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {password && confirmPassword && password !== confirmPassword && (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>Passwords don&apos;t match</p>
          )}
        </div>
      )}

      {/* Step 2: Display Name + Username */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <div>
            <input
              type="text"
              placeholder="Username (min 3 characters)"
              value={username}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                setUsername(val);
                checkUsername(val);
              }}
              style={{ width: '100%' }}
              required
            />
            {usernameChecking && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>Checking...</p>
            )}
            {!usernameChecking && usernameAvailable === true && username.length >= 3 && (
              <p style={{ color: 'var(--success)', fontSize: '0.8rem', marginTop: 4 }}>Username available!</p>
            )}
            {!usernameChecking && usernameAvailable === false && (
              <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 4 }}>Username taken</p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Avatar + Pronouns + Bio */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--bg-tertiary)',
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              {avatarPreview && (
                <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
            <div>
              <label className="btn-secondary" style={{
                display: 'inline-block',
                cursor: 'pointer',
                fontSize: '0.85rem',
                padding: '8px 16px',
              }}>
                Upload Avatar
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>Optional</p>
            </div>
          </div>
          <select
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value)}
          >
            <option value="">Pronouns (optional)</option>
            <option value="he/him">he/him</option>
            <option value="she/her">she/her</option>
            <option value="they/them">they/them</option>
            <option value="he/they">he/they</option>
            <option value="she/they">she/they</option>
            <option value="any">any pronouns</option>
          </select>
          <textarea
            placeholder="Bio (optional)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>
      )}

      {/* Step 4: Newsletter */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            padding: '1rem',
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
          }}>
            <input
              type="checkbox"
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
            />
            <div>
              <p style={{ fontWeight: 500 }}>Subscribe to newsletter</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Get updates about new features and games
              </p>
            </div>
          </label>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
            You can change this later in settings
          </p>
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '1rem' }}>
        {step > 1 && (
          <button
            className="btn-secondary"
            onClick={() => setStep((s) => (s - 1) as Step)}
            style={{ flex: 1 }}
          >
            Back
          </button>
        )}
        {step < 4 ? (
          <button
            className="btn-primary"
            onClick={() => setStep((s) => (s + 1) as Step)}
            disabled={!canProceed()}
            style={{ flex: 1 }}
          >
            Next
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        )}
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Already have an account?{' '}
        <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
