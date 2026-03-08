'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Clock, Fingerprint, Globe, Ban, X, Search, History, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface BanRecord {
  id: string;
  user_id: string;
  banned_by: string;
  ban_type: string;
  reason: string;
  hwid: string | null;
  ip_address: string | null;
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
  user: { username: string; display_name: string; avatar_url: string | null };
  moderator: { username: string; display_name: string };
}

const BAN_TYPES = [
  { value: 'permanent', label: 'Permanent Ban', icon: Ban, desc: 'Permanently block account access', color: '#ef4444' },
  { value: 'temporary', label: 'Timeout', icon: Clock, desc: 'Temporarily restrict access', color: '#f59e0b' },
  { value: 'hwid', label: 'HWID Ban', icon: Fingerprint, desc: 'Block by hardware identifier', color: '#dc2626' },
  { value: 'ip', label: 'IP Ban', icon: Globe, desc: 'Block by IP address', color: '#b91c1c' },
];

const DURATION_PRESETS = [
  { label: '30 min', value: '30m' },
  { label: '1 hour', value: '1h' },
  { label: '6 hours', value: '6h' },
  { label: '1 day', value: '1d' },
  { label: '3 days', value: '3d' },
  { label: '1 week', value: '1w' },
  { label: '2 weeks', value: '2w' },
  { label: '4 weeks', value: '4w' },
];

export default function ModerationPage() {
  const [activeBans, setActiveBans] = useState<BanRecord[]>([]);
  const [historyBans, setHistoryBans] = useState<BanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'create' | 'history'>('active');
  const [hasPermission, setHasPermission] = useState(false);

  // Create form state
  const [username, setUsername] = useState('');
  const [banType, setBanType] = useState('permanent');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('1d');
  const [hwid, setHwid] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // History search
  const [historySearch, setHistorySearch] = useState('');

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const res = await fetch('/api/permissions');
    const data = await res.json();
    const perms: string[] = data.permissions || [];
    if (perms.includes('ban_users') || perms.includes('kick_users')) {
      setHasPermission(true);
      loadActiveBans();
    }
    setLoading(false);
  };

  const loadActiveBans = async () => {
    const res = await fetch('/api/admin/moderation');
    if (res.ok) {
      const data = await res.json();
      setActiveBans(data);
    }
  };

  const loadHistory = async (search?: string) => {
    const params = search ? `?username=${encodeURIComponent(search)}` : '';
    const res = await fetch(`/api/admin/moderation/history${params}`);
    if (res.ok) {
      const data = await res.json();
      setHistoryBans(data);
    }
  };

  const handleCreate = async () => {
    setError('');
    setSuccess('');
    if (!username.trim()) { setError('Username is required'); return; }
    if (banType === 'ip' && !ipAddress.trim()) { setError('IP address is required for IP bans'); return; }

    setCreating(true);
    const res = await fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim(),
        banType,
        reason: reason.trim(),
        duration: banType === 'temporary' ? duration : undefined,
        hwid: banType === 'hwid' ? hwid.trim() : undefined,
        ipAddress: banType === 'ip' ? ipAddress.trim() : undefined,
      }),
    });

    if (res.ok) {
      setSuccess(`${banType === 'temporary' ? 'Timeout' : 'Ban'} applied to ${username}`);
      setUsername('');
      setReason('');
      setHwid('');
      setIpAddress('');
      loadActiveBans();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to create ban');
    }
    setCreating(false);
  };

  const handleRevoke = async (banId: string) => {
    const res = await fetch('/api/admin/moderation', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banId }),
    });
    if (res.ok) {
      setActiveBans(prev => prev.filter(b => b.id !== banId));
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!hasPermission) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      <Shield size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
      <p>You don&apos;t have permission to access this page.</p>
    </div>
  );

  const selectedBanType = BAN_TYPES.find(b => b.value === banType)!;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <style>{`
        .mod-tab {
          padding: 0.5rem 1rem;
          border: none;
          background: none;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: color 0.15s, border-color 0.15s;
        }
        .mod-tab:hover { color: var(--text-primary); }
        .mod-tab.active {
          color: var(--text-primary);
          border-bottom-color: var(--accent);
          font-weight: 600;
        }
        .mod-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 1rem;
          transition: border-color 0.15s;
        }
        .mod-card:hover { border-color: var(--text-muted); }
        .mod-input {
          width: 100%;
          padding: 0.55rem 0.75rem;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.15s;
          font-family: inherit;
        }
        .mod-input:focus { border-color: var(--accent); }
        .mod-input::placeholder { color: var(--text-muted); }
        .ban-type-btn {
          flex: 1;
          padding: 0.6rem 0.5rem;
          border: 1.5px solid var(--border);
          border-radius: 8px;
          background: var(--bg-primary);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.72rem;
          transition: border-color 0.15s, background 0.15s, transform 0.1s;
          font-family: inherit;
        }
        .ban-type-btn:hover { transform: scale(1.02); }
        .ban-type-btn.selected {
          border-color: var(--accent);
          background: var(--accent-muted);
          color: var(--text-primary);
        }
        .duration-btn {
          padding: 0.35rem 0.65rem;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.78rem;
          transition: all 0.12s;
          font-family: inherit;
        }
        .duration-btn:hover { border-color: var(--text-muted); }
        .duration-btn.selected {
          border-color: var(--accent);
          background: var(--accent-muted);
          color: var(--text-primary);
          font-weight: 600;
        }
        .revoke-btn {
          padding: 0.3rem 0.7rem;
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 500;
          transition: all 0.15s;
          font-family: inherit;
        }
        .revoke-btn:hover { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; }
        .submit-btn {
          padding: 0.6rem 1.5rem;
          border: none;
          border-radius: 8px;
          background: #ef4444;
          color: #fff;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          font-family: inherit;
        }
        .submit-btn:hover { opacity: 0.9; }
        .submit-btn:active { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {/* Header */}
      <div className="animate-in" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <Link href="/settings" style={{ color: 'var(--text-muted)', display: 'flex' }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Moderation</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Manage bans, timeouts, and user restrictions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="animate-in stagger-1" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
        <button className={`mod-tab${tab === 'active' ? ' active' : ''}`} onClick={() => setTab('active')}>
          Active Bans
        </button>
        <button className={`mod-tab${tab === 'create' ? ' active' : ''}`} onClick={() => setTab('create')}>
          New Action
        </button>
        <button className={`mod-tab${tab === 'history' ? ' active' : ''}`} onClick={() => { setTab('history'); loadHistory(); }}>
          History
        </button>
      </div>

      {/* Active Bans Tab */}
      {tab === 'active' && (
        <div className="animate-in stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {activeBans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.9rem' }}>No active bans</p>
              <p style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>All users currently have access.</p>
            </div>
          ) : (
            activeBans.map((ban) => {
              const typeInfo = BAN_TYPES.find(b => b.value === ban.ban_type);
              const Icon = typeInfo?.icon || Ban;
              const isExpired = ban.expires_at && new Date(ban.expires_at) < new Date();
              return (
                <div key={ban.id} className="mod-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--bg-tertiary)', overflow: 'hidden', flexShrink: 0,
                  }}>
                    {ban.user?.avatar_url ? (
                      <img src={ban.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {ban.user?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{ban.user?.display_name || ban.user?.username}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>@{ban.user?.username}</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                        padding: '1px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600,
                        background: `${typeInfo?.color}18`, color: typeInfo?.color,
                      }}>
                        <Icon size={10} />
                        {typeInfo?.label}
                      </span>
                    </div>
                    {ban.reason && <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 2 }}>{ban.reason}</p>}
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      <span>by {ban.moderator?.display_name || ban.moderator?.username}</span>
                      <span>{new Date(ban.created_at).toLocaleDateString()}</span>
                      {ban.expires_at && (
                        <span style={{ color: isExpired ? '#22c55e' : '#f59e0b' }}>
                          {isExpired ? 'Expired' : `Expires ${new Date(ban.expires_at).toLocaleString()}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <button className="revoke-btn" onClick={() => handleRevoke(ban.id)}>
                    Revoke
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create Ban Tab */}
      {tab === 'create' && (
        <div className="animate-in stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 0.85rem', borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444', fontSize: '0.82rem',
            }}>
              <AlertTriangle size={14} />
              {error}
            </div>
          )}
          {success && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 0.85rem', borderRadius: 8,
              background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)',
              color: '#22c55e', fontSize: '0.82rem',
            }}>
              <CheckCircle2 size={14} />
              {success}
            </div>
          )}

          {/* Username */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Target User
            </label>
            <input
              className="mod-input"
              placeholder="Enter username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* Ban Type */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Action Type
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {BAN_TYPES.map(bt => {
                const Icon = bt.icon;
                return (
                  <button
                    key={bt.value}
                    className={`ban-type-btn${banType === bt.value ? ' selected' : ''}`}
                    onClick={() => setBanType(bt.value)}
                  >
                    <Icon size={16} style={{ color: banType === bt.value ? bt.color : undefined }} />
                    <span style={{ fontWeight: 600 }}>{bt.label}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{bt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration (for temporary) */}
          {banType === 'temporary' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                Duration
              </label>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {DURATION_PRESETS.map(d => (
                  <button
                    key={d.value}
                    className={`duration-btn${duration === d.value ? ' selected' : ''}`}
                    onClick={() => setDuration(d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* HWID info */}
          {banType === 'hwid' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.7rem 0.85rem', borderRadius: 8,
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            }}>
              <Fingerprint size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Auto-detected from user&apos;s browser
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  The device fingerprint is collected automatically when users access the site.
                  This ban will block the user&apos;s device even if they create a new account.
                </p>
              </div>
            </div>
          )}

          {/* IP field */}
          {banType === 'ip' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                IP Address
              </label>
              <input
                className="mod-input"
                placeholder="e.g. 192.168.1.100 or CIDR range..."
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.3rem' }}>
                Block all access from this IP address. Use CIDR notation for ranges (e.g. 10.0.0.0/24).
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Reason
            </label>
            <textarea
              className="mod-input"
              placeholder="Why is this user being banned? (visible to moderators)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Warning box */}
          <div style={{
            display: 'flex', gap: '0.6rem', padding: '0.75rem',
            background: `${selectedBanType.color}08`, border: `1px solid ${selectedBanType.color}20`,
            borderRadius: 8,
          }}>
            <AlertTriangle size={16} style={{ color: selectedBanType.color, flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {banType === 'permanent' && 'This will permanently block the user from accessing the platform. They will see a ban notice when trying to log in.'}
              {banType === 'temporary' && `This will restrict the user's access for the selected duration. They will be automatically unbanned when the timeout expires.`}
              {banType === 'hwid' && 'This blocks the specific hardware/browser fingerprint. The user will be unable to access the platform even with a new account from the same device. Useful against ban evasion.'}
              {banType === 'ip' && 'This blocks all access from the specified IP address. Be careful with shared networks — this could affect other users on the same network.'}
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              className="submit-btn"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? 'Applying...' : `Apply ${selectedBanType.label}`}
            </button>
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="animate-in stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="mod-input"
                placeholder="Search by username..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadHistory(historySearch)}
                style={{ paddingLeft: 32 }}
              />
            </div>
            <button
              onClick={() => loadHistory(historySearch)}
              style={{
                padding: '0 1rem', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                cursor: 'pointer', fontSize: '0.82rem',
              }}
            >
              Search
            </button>
          </div>

          {historyBans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <History size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.85rem' }}>No moderation history found</p>
            </div>
          ) : (
            historyBans.map((ban) => {
              const typeInfo = BAN_TYPES.find(b => b.value === ban.ban_type);
              const Icon = typeInfo?.icon || Ban;
              return (
                <div key={ban.id} className="mod-card" style={{ opacity: ban.is_active ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ban.user?.display_name || ban.user?.username}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>@{ban.user?.username}</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                      padding: '1px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600,
                      background: `${typeInfo?.color}18`, color: typeInfo?.color,
                    }}>
                      <Icon size={10} />
                      {typeInfo?.label}
                    </span>
                    {!ban.is_active && (
                      <span style={{
                        padding: '1px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600,
                        background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e',
                      }}>
                        Revoked
                      </span>
                    )}
                  </div>
                  {ban.reason && <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{ban.reason}</p>}
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>by {ban.moderator?.display_name || ban.moderator?.username}</span>
                    <span>{new Date(ban.created_at).toLocaleString()}</span>
                    {ban.expires_at && <span>Expires {new Date(ban.expires_at).toLocaleString()}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
