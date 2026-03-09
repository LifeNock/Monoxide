'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Shield, Clock, Fingerprint, Globe, Ban, X, Search, History, AlertTriangle, CheckCircle2, Users, AtSign, MessageSquareOff, Ghost, Wifi, Copy, Check, Undo2 } from 'lucide-react';
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

interface OnlineUser {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  ip: string;
  hwid: string | null;
  connectedAt: string;
}

interface WordFilterEntry {
  id: string;
  word: string;
  replacement: string;
  action: string;
  created_at: string;
}

interface EmailBlacklistEntry {
  id: string;
  domain: string;
  reason: string;
  created_at: string;
}

const BAN_TYPES = [
  { value: 'permanent', label: 'Permanent Ban', undo: 'Unban', icon: Ban, desc: 'Permanently block access', color: '#ef4444' },
  { value: 'temporary', label: 'Timeout', undo: 'Untimeout', icon: Clock, desc: 'Temporarily restrict', color: '#f59e0b' },
  { value: 'hwid', label: 'HWID Ban', undo: 'Remove HWID Ban', icon: Fingerprint, desc: 'Block by device', color: '#dc2626' },
  { value: 'ip', label: 'IP Ban', undo: 'Remove IP Ban', icon: Globe, desc: 'Block by IP', color: '#b91c1c' },
  { value: 'poison', label: 'Poison Ban', undo: 'Remove Poison Ban', icon: Ghost, desc: 'Silent redirect loop', color: '#7c3aed' },
];

const DURATION_PRESETS = [
  { label: '30m', value: '30m' }, { label: '1h', value: '1h' }, { label: '6h', value: '6h' },
  { label: '1d', value: '1d' }, { label: '3d', value: '3d' }, { label: '1w', value: '1w' },
  { label: '2w', value: '2w' }, { label: '4w', value: '4w' },
];

type Tab = 'online' | 'active' | 'create' | 'history' | 'wordfilter' | 'emailblock' | 'dmsearch';

export default function ModerationPage() {
  const [activeBans, setActiveBans] = useState<BanRecord[]>([]);
  const [historyBans, setHistoryBans] = useState<BanRecord[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [wordFilter, setWordFilter] = useState<WordFilterEntry[]>([]);
  const [emailBlacklist, setEmailBlacklist] = useState<EmailBlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('online');
  const [perms, setPerms] = useState<string[]>([]);
  const onlineInterval = useRef<NodeJS.Timeout | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Create form
  const [username, setUsername] = useState('');
  const [banType, setBanType] = useState('permanent');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('1d');
  const [ipAddress, setIpAddress] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  // Word filter form
  const [newWord, setNewWord] = useState('');
  const [newReplacement, setNewReplacement] = useState('***');

  // Revoke confirmation
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  // Email blacklist form
  const [newDomain, setNewDomain] = useState('');
  const [domainReason, setDomainReason] = useState('');

  // DM search
  const [dmSearchQuery, setDmSearchQuery] = useState('');
  const [dmSearchType, setDmSearchType] = useState<'message' | 'user'>('message');
  const [dmSearchResults, setDmSearchResults] = useState<any[]>([]);
  const [dmViewConvId, setDmViewConvId] = useState<string | null>(null);
  const [dmViewData, setDmViewData] = useState<any>(null);
  const [dmSearchLoading, setDmSearchLoading] = useState(false);

  useEffect(() => {
    checkPermissions();
    return () => { if (onlineInterval.current) clearInterval(onlineInterval.current); };
  }, []);

  const checkPermissions = async () => {
    const res = await fetch('/api/permissions');
    const data = await res.json();
    const p: string[] = data.permissions || [];
    setPerms(p);
    if (p.includes('ban_users') || p.includes('kick_users') || p.includes('manage_word_filter')) {
      loadActiveBans();
      loadOnlineUsers();
      // Poll online users every second
      onlineInterval.current = setInterval(loadOnlineUsers, 1000);
    }
    setLoading(false);
  };

  const loadActiveBans = async () => {
    const res = await fetch('/api/admin/moderation');
    if (res.ok) setActiveBans(await res.json());
  };

  const loadHistory = async (search?: string) => {
    const params = search ? `?username=${encodeURIComponent(search)}` : '';
    const res = await fetch(`/api/admin/moderation/history${params}`);
    if (res.ok) setHistoryBans(await res.json());
  };

  const loadOnlineUsers = async () => {
    try {
      const res = await fetch('/api/admin/online-users');
      if (res.ok) setOnlineUsers(await res.json());
    } catch {}
  };

  const loadWordFilter = async () => {
    const res = await fetch('/api/admin/word-filter');
    if (res.ok) setWordFilter(await res.json());
  };

  const loadEmailBlacklist = async () => {
    const res = await fetch('/api/admin/email-blacklist');
    if (res.ok) setEmailBlacklist(await res.json());
  };

  const handleCreate = async () => {
    setError(''); setSuccess('');
    if (!username.trim()) { setError('Username is required'); return; }
    if (banType === 'ip' && !ipAddress.trim()) { setError('IP address required for IP bans'); return; }

    setCreating(true);
    const res = await fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim(), banType, reason: reason.trim(),
        duration: banType === 'temporary' ? duration : undefined,
        ipAddress: banType === 'ip' ? ipAddress.trim() : undefined,
      }),
    });

    if (res.ok) {
      setSuccess(`${banType === 'poison' ? 'Poison ban' : banType === 'temporary' ? 'Timeout' : 'Ban'} applied to ${username}`);
      setUsername(''); setReason(''); setIpAddress('');
      loadActiveBans();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed');
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
      setConfirmRevoke(null);
    }
  };

  const addFilteredWord = async () => {
    if (!newWord.trim()) return;
    const res = await fetch('/api/admin/word-filter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: newWord.trim(), replacement: newReplacement.trim() || '***' }),
    });
    if (res.ok) { setNewWord(''); setNewReplacement('***'); loadWordFilter(); }
  };

  const deleteFilteredWord = async (id: string) => {
    await fetch('/api/admin/word-filter', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setWordFilter(prev => prev.filter(w => w.id !== id));
  };

  const addBlacklistedDomain = async () => {
    if (!newDomain.trim()) return;
    const res = await fetch('/api/admin/email-blacklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: newDomain.trim(), reason: domainReason.trim() }),
    });
    if (res.ok) { setNewDomain(''); setDomainReason(''); loadEmailBlacklist(); }
  };

  const deleteBlacklistedDomain = async (id: string) => {
    await fetch('/api/admin/email-blacklist', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setEmailBlacklist(prev => prev.filter(d => d.id !== id));
  };

  const copyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 1500);
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>;

  const hasBanPerm = perms.includes('ban_users') || perms.includes('kick_users');
  const hasWordFilterPerm = perms.includes('manage_word_filter');
  if (!hasBanPerm && !hasWordFilterPerm) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      <Shield size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
      <p>You don&apos;t have permission to access this page.</p>
    </div>
  );

  const selectedBanType = BAN_TYPES.find(b => b.value === banType)!;

  const tabs: { id: Tab; label: string; perm: boolean; onClick?: () => void }[] = [
    { id: 'online', label: `Online (${onlineUsers.length})`, perm: hasBanPerm },
    { id: 'active', label: 'Active Bans', perm: hasBanPerm },
    { id: 'create', label: 'New Action', perm: hasBanPerm },
    { id: 'history', label: 'History', perm: hasBanPerm, onClick: () => loadHistory() },
    { id: 'wordfilter', label: 'Word Filter', perm: hasWordFilterPerm, onClick: loadWordFilter },
    { id: 'emailblock', label: 'Email Blacklist', perm: hasBanPerm, onClick: loadEmailBlacklist },
    { id: 'dmsearch', label: 'DM Search', perm: hasBanPerm },
  ];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <style>{`
        .mod-tab { padding: 0.5rem 0.75rem; border: none; background: none; color: var(--text-muted); font-size: 0.8rem; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s; white-space: nowrap; }
        .mod-tab:hover { color: var(--text-primary); }
        .mod-tab.active { color: var(--text-primary); border-bottom-color: var(--accent); font-weight: 600; }
        .mod-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 0.85rem 1rem; transition: border-color 0.15s; }
        .mod-card:hover { border-color: var(--text-muted); }
        .mod-input { width: 100%; padding: 0.55rem 0.75rem; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); font-size: 0.85rem; outline: none; transition: border-color 0.15s; font-family: inherit; }
        .mod-input:focus { border-color: var(--accent); }
        .mod-input::placeholder { color: var(--text-muted); }
        .ban-type-btn { flex: 1; min-width: 0; padding: 0.5rem 0.3rem; border: 1.5px solid var(--border); border-radius: 8px; background: var(--bg-primary); color: var(--text-secondary); cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 0.2rem; font-size: 0.68rem; transition: all 0.15s; font-family: inherit; }
        .ban-type-btn:hover { transform: scale(1.02); }
        .ban-type-btn.selected { border-color: var(--accent); background: var(--accent-muted); color: var(--text-primary); }
        .duration-btn { padding: 0.3rem 0.55rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-primary); color: var(--text-secondary); cursor: pointer; font-size: 0.78rem; transition: all 0.12s; font-family: inherit; }
        .duration-btn:hover { border-color: var(--text-muted); }
        .duration-btn.selected { border-color: var(--accent); background: var(--accent-muted); color: var(--text-primary); font-weight: 600; }
        .revoke-btn { padding: 0.3rem 0.7rem; border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; background: rgba(239,68,68,0.1); color: #ef4444; cursor: pointer; font-size: 0.75rem; font-weight: 500; transition: all 0.15s; font-family: inherit; }
        .revoke-btn:hover { background: rgba(239,68,68,0.2); border-color: #ef4444; }
        .submit-btn { padding: 0.6rem 1.5rem; border: none; border-radius: 8px; background: #ef4444; color: #fff; font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s; font-family: inherit; }
        .submit-btn:hover { opacity: 0.9; }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .del-btn { padding: 0.2rem; background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; border-radius: 4px; transition: color 0.15s; }
        .del-btn:hover { color: #ef4444; }
      `}</style>

      <div className="animate-in" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <Link href="/settings" style={{ color: 'var(--text-muted)', display: 'flex' }}><ArrowLeft size={20} /></Link>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Moderation</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Manage bans, users, filters, and restrictions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="animate-in stagger-1" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: '1.25rem', overflowX: 'auto' }}>
        {tabs.filter(t => t.perm).map(t => (
          <button key={t.id} className={`mod-tab${tab === t.id ? ' active' : ''}`} onClick={() => { setTab(t.id); t.onClick?.(); }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== ONLINE USERS TAB ===== */}
      {tab === 'online' && (
        <div className="animate-in stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {onlineUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Users size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.9rem' }}>No users online</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0 0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span style={{ flex: 1 }}>User</span>
                <span style={{ width: 140 }}>IP Address</span>
                <span style={{ width: 120 }}>HWID</span>
                <span style={{ width: 80 }}>Connected</span>
              </div>
              {onlineUsers.map(u => (
                <div key={u.userId} className="mod-card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-tertiary)', overflow: 'hidden', flexShrink: 0 }}>
                    {u.avatarUrl ? <img src={u.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}>{u.username[0]?.toUpperCase()}</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.displayName}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: 6 }}>@{u.username}</span>
                    <Wifi size={10} style={{ color: '#22c55e', marginLeft: 6 }} />
                  </div>
                  <div style={{ width: 140, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <code style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{u.ip}</code>
                    <button className="del-btn" onClick={() => copyIp(u.ip)} style={{ color: copiedIp === u.ip ? '#22c55e' : 'var(--text-muted)' }}>
                      {copiedIp === u.ip ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  </div>
                  <div style={{ width: 120 }}>
                    <code style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 120 }}>{u.hwid || 'N/A'}</code>
                  </div>
                  <div style={{ width: 80, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {new Date(u.connectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ===== ACTIVE BANS TAB ===== */}
      {tab === 'active' && (
        <div className="animate-in stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {activeBans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.9rem' }}>No active bans</p>
            </div>
          ) : (
            activeBans.map(ban => {
              const typeInfo = BAN_TYPES.find(b => b.value === ban.ban_type);
              const Icon = typeInfo?.icon || Ban;
              const isExpired = ban.expires_at && new Date(ban.expires_at) < new Date();
              const isConfirming = confirmRevoke === ban.id;
              return (
                <div key={ban.id} className="mod-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-tertiary)', overflow: 'hidden', flexShrink: 0 }}>
                    {ban.user?.avatar_url ? <img src={ban.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{ban.user?.username?.[0]?.toUpperCase() || '?'}</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{ban.user?.display_name || ban.user?.username}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>@{ban.user?.username}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '1px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600, background: `${typeInfo?.color}18`, color: typeInfo?.color }}>
                        <Icon size={10} /> {typeInfo?.label}
                      </span>
                    </div>
                    {ban.reason && <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 2 }}>{ban.reason}</p>}
                    {ban.ip_address && <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 2 }}>IP: <code style={{ background: 'var(--bg-primary)', padding: '1px 5px', borderRadius: 3 }}>{ban.ip_address}</code></p>}
                    {ban.hwid && <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 2 }}>HWID: <code style={{ background: 'var(--bg-primary)', padding: '1px 5px', borderRadius: 3, fontSize: '0.65rem' }}>{ban.hwid.slice(0, 16)}...</code></p>}
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      <span>by {ban.moderator?.display_name || ban.moderator?.username}</span>
                      <span>{new Date(ban.created_at).toLocaleDateString()}</span>
                      {ban.expires_at && <span style={{ color: isExpired ? '#22c55e' : '#f59e0b' }}>{isExpired ? 'Expired' : `Expires ${new Date(ban.expires_at).toLocaleString()}`}</span>}
                    </div>
                  </div>
                  {isConfirming ? (
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Sure?</span>
                      <button className="revoke-btn" onClick={() => handleRevoke(ban.id)} style={{ background: 'rgba(239,68,68,0.2)', borderColor: '#ef4444' }}>
                        <Undo2 size={11} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 3 }} />{typeInfo?.undo || 'Revoke'}
                      </button>
                      <button className="del-btn" onClick={() => setConfirmRevoke(null)} style={{ padding: '0.3rem' }}><X size={13} /></button>
                    </div>
                  ) : (
                    <button className="revoke-btn" onClick={() => setConfirmRevoke(ban.id)}>
                      <Undo2 size={11} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 3 }} />{typeInfo?.undo || 'Revoke'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===== CREATE BAN TAB ===== */}
      {tab === 'create' && (
        <div className="animate-in stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.82rem' }}><AlertTriangle size={14} />{error}</div>}
          {success && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: '0.82rem' }}><CheckCircle2 size={14} />{success}</div>}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Target User</label>
            <input className="mod-input" placeholder="Enter username..." value={username} onChange={e => setUsername(e.target.value)} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Action Type</label>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {BAN_TYPES.map(bt => {
                const Icon = bt.icon;
                return (
                  <button key={bt.value} className={`ban-type-btn${banType === bt.value ? ' selected' : ''}`} onClick={() => setBanType(bt.value)}>
                    <Icon size={15} style={{ color: banType === bt.value ? bt.color : undefined }} />
                    <span style={{ fontWeight: 600 }}>{bt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {banType === 'temporary' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Duration</label>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {DURATION_PRESETS.map(d => <button key={d.value} className={`duration-btn${duration === d.value ? ' selected' : ''}`} onClick={() => setDuration(d.value)}>{d.label}</button>)}
              </div>
            </div>
          )}

          {banType === 'hwid' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 0.85rem', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <Fingerprint size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>Auto-detected from user&apos;s browser</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Blocks the device even with new accounts.</p>
              </div>
            </div>
          )}

          {banType === 'poison' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 0.85rem', borderRadius: 8, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
              <Ghost size={18} style={{ color: '#7c3aed', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>Silent ban &mdash; user won&apos;t know they&apos;re banned</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Login will silently fail with &quot;Invalid email or password&quot;. No ban page shown.</p>
              </div>
            </div>
          )}

          {banType === 'ip' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>IP Address</label>
              <input className="mod-input" placeholder="e.g. 192.168.1.100" value={ipAddress} onChange={e => setIpAddress(e.target.value)} />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Reason</label>
            <textarea className="mod-input" placeholder="Why? (visible to moderators only)" value={reason} onChange={e => setReason(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', padding: '0.75rem', background: `${selectedBanType.color}08`, border: `1px solid ${selectedBanType.color}20`, borderRadius: 8 }}>
            <AlertTriangle size={16} style={{ color: selectedBanType.color, flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {banType === 'permanent' && 'Permanently blocks the user. They will see a ban notice.'}
              {banType === 'temporary' && 'Restricts access for the selected duration. Auto-unbans when expired.'}
              {banType === 'hwid' && 'Blocks the device fingerprint. User cannot access even with new accounts from the same device.'}
              {banType === 'ip' && 'Blocks all access from the specified IP. May affect other users on shared networks.'}
              {banType === 'poison' && 'Silently prevents login. User will think their credentials are wrong. They will never see a ban page.'}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="submit-btn" onClick={handleCreate} disabled={creating}>
              {creating ? 'Applying...' : `Apply ${selectedBanType.label}`}
            </button>
          </div>
        </div>
      )}

      {/* ===== HISTORY TAB ===== */}
      {tab === 'history' && (
        <div className="animate-in stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="mod-input" placeholder="Search by username..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadHistory(historySearch)} style={{ paddingLeft: 32 }} />
            </div>
            <button onClick={() => loadHistory(historySearch)} style={{ padding: '0 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.82rem' }}>Search</button>
          </div>
          {historyBans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <History size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.85rem' }}>No moderation history found</p>
            </div>
          ) : historyBans.map(ban => {
            const typeInfo = BAN_TYPES.find(b => b.value === ban.ban_type);
            const Icon = typeInfo?.icon || Ban;
            return (
              <div key={ban.id} className="mod-card" style={{ opacity: ban.is_active ? 1 : 0.6, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ban.user?.display_name || ban.user?.username}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>@{ban.user?.username}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '1px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600, background: `${typeInfo?.color}18`, color: typeInfo?.color }}><Icon size={10} /> {typeInfo?.label}</span>
                    {!ban.is_active && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '1px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}><Undo2 size={9} /> {typeInfo?.undo ? `${typeInfo.undo}d` : 'Revoked'}</span>}
                  </div>
                  {ban.reason && <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{ban.reason}</p>}
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>by {ban.moderator?.display_name || ban.moderator?.username}</span>
                    <span>{new Date(ban.created_at).toLocaleString()}</span>
                    {ban.expires_at && <span>Expires {new Date(ban.expires_at).toLocaleString()}</span>}
                  </div>
                </div>
                {ban.is_active && (
                  <button className="revoke-btn" onClick={() => { handleRevoke(ban.id); setHistoryBans(prev => prev.map(b => b.id === ban.id ? { ...b, is_active: false } : b)); }}>
                    <Undo2 size={11} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 3 }} />{typeInfo?.undo || 'Revoke'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== WORD FILTER TAB ===== */}
      {tab === 'wordfilter' && (
        <div className="animate-in stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="mod-card" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>Word/Phrase</label>
              <input className="mod-input" placeholder="e.g. badword" value={newWord} onChange={e => setNewWord(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFilteredWord()} />
            </div>
            <div style={{ width: 120 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>Replace with</label>
              <input className="mod-input" placeholder="***" value={newReplacement} onChange={e => setNewReplacement(e.target.value)} />
            </div>
            <button onClick={addFilteredWord} style={{ padding: '0.55rem 1rem', borderRadius: 8, background: 'var(--accent)', color: 'var(--bg-primary)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' }}>Add</button>
          </div>

          {wordFilter.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <MessageSquareOff size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.85rem' }}>No filtered words</p>
            </div>
          ) : wordFilter.map(w => (
            <div key={w.id} className="mod-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem' }}>
              <code style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '2px 8px', borderRadius: 4 }}>{w.word}</code>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>&rarr;</span>
              <code style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{w.replacement}</code>
              <div style={{ flex: 1 }} />
              <button className="del-btn" onClick={() => deleteFilteredWord(w.id)}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {/* ===== EMAIL BLACKLIST TAB ===== */}
      {tab === 'emailblock' && (
        <div className="animate-in stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="mod-card" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>Email Domain</label>
              <input className="mod-input" placeholder="e.g. tempmail.com" value={newDomain} onChange={e => setNewDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && addBlacklistedDomain()} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>Reason (optional)</label>
              <input className="mod-input" placeholder="e.g. Disposable email" value={domainReason} onChange={e => setDomainReason(e.target.value)} />
            </div>
            <button onClick={addBlacklistedDomain} style={{ padding: '0.55rem 1rem', borderRadius: 8, background: 'var(--accent)', color: 'var(--bg-primary)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' }}>Block</button>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Users with emails from blocked domains will be unable to create new accounts. Existing accounts are not affected.
          </p>

          {emailBlacklist.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <AtSign size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.85rem' }}>No blocked domains</p>
            </div>
          ) : emailBlacklist.map(d => (
            <div key={d.id} className="mod-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem' }}>
              <AtSign size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <code style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>{d.domain}</code>
              {d.reason && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>&mdash; {d.reason}</span>}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(d.created_at).toLocaleDateString()}</span>
              <button className="del-btn" onClick={() => deleteBlacklistedDomain(d.id)}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {/* ===== DM SEARCH TAB ===== */}
      {tab === 'dmsearch' && (
        <div className="animate-in stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select value={dmSearchType} onChange={e => setDmSearchType(e.target.value as any)} style={{ padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'inherit' }}>
              <option value="message">Search Messages</option>
              <option value="user">Search by User</option>
            </select>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="mod-input" placeholder={dmSearchType === 'message' ? 'Search message content...' : 'Search by username...'} value={dmSearchQuery} onChange={e => setDmSearchQuery(e.target.value)} onKeyDown={e => {
                if (e.key === 'Enter') {
                  setDmSearchLoading(true);
                  const param = dmSearchType === 'message' ? `q=${encodeURIComponent(dmSearchQuery)}` : `username=${encodeURIComponent(dmSearchQuery)}`;
                  fetch(`/api/admin/dm?${param}`).then(r => r.json()).then(data => { setDmSearchResults(data); setDmSearchLoading(false); setDmViewConvId(null); setDmViewData(null); }).catch(() => setDmSearchLoading(false));
                }
              }} style={{ paddingLeft: 32 }} />
            </div>
          </div>

          {dmSearchLoading && <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Searching...</div>}

          {/* View conversation messages */}
          {dmViewData ? (
            <div>
              <button onClick={() => { setDmViewData(null); setDmViewConvId(null); }} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', marginBottom: '0.5rem', fontFamily: 'inherit' }}>
                &larr; Back to results
              </button>
              <div className="mod-card" style={{ marginBottom: '0.5rem', padding: '0.6rem 0.85rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {dmViewData.conversation?.type === 'group' ? 'Group: ' : 'DM: '}
                  <strong style={{ color: 'var(--text-primary)' }}>{dmViewData.conversation?.name || dmViewData.participants?.map((p: any) => p.display_name || p.username).join(', ')}</strong>
                  <span style={{ marginLeft: 8 }}>({dmViewData.participants?.length} participants)</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 400, overflowY: 'auto' }} className="chat-scroll">
                {(dmViewData.messages || []).map((m: any) => (
                  <div key={m.id} className="mod-card" style={{ padding: '0.5rem 0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{m.display_name || m.username}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleString()}</span>
                      {m.is_deleted && <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 600 }}>[deleted]</span>}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: m.is_deleted ? 'var(--text-muted)' : 'var(--text-secondary)', fontStyle: m.is_deleted ? 'italic' : 'normal' }}>{m.content || '(image)'}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Message search results */}
              {dmSearchType === 'message' && dmSearchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {dmSearchResults.map((m: any) => (
                    <div key={m.id} className="mod-card" style={{ padding: '0.5rem 0.75rem', cursor: 'pointer' }} onClick={() => {
                      setDmViewConvId(m.conversation_id);
                      setDmSearchLoading(true);
                      fetch(`/api/admin/dm?conversationId=${m.conversation_id}`).then(r => r.json()).then(data => { setDmViewData(data); setDmSearchLoading(false); }).catch(() => setDmSearchLoading(false));
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{m.display_name || m.username}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleString()}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--accent)', marginLeft: 'auto' }}>{m.conversation_type === 'group' ? m.conversation_name || 'Group' : 'DM'}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{m.content}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* User conversation search results */}
              {dmSearchType === 'user' && dmSearchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {dmSearchResults.map((conv: any) => (
                    <div key={conv.id} className="mod-card" style={{ padding: '0.5rem 0.75rem', cursor: 'pointer' }} onClick={() => {
                      setDmSearchLoading(true);
                      fetch(`/api/admin/dm?conversationId=${conv.id}`).then(r => r.json()).then(data => { setDmViewData(data); setDmSearchLoading(false); }).catch(() => setDmSearchLoading(false));
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{conv.type === 'group' ? conv.name || 'Group Chat' : 'DM'}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{conv.participants?.map((p: any) => p.display_name || p.username).join(', ')}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{new Date(conv.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!dmSearchLoading && dmSearchResults.length === 0 && dmSearchQuery && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No results found</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
