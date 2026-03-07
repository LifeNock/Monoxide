'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ShieldAlert, X, UserPlus } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  color: string;
  priority: number;
  permissions: Record<string, boolean>;
}

const permissionLabels: Record<string, string> = {
  send_messages: 'Send Messages',
  delete_messages: 'Delete Messages',
  manage_channels: 'Manage Channels',
  manage_roles: 'Manage Roles',
  ban_users: 'Ban Users',
  kick_users: 'Kick Users',
  manage_word_filter: 'Manage Word Filter',
  manage_badges: 'Manage Badges',
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [addUsername, setAddUsername] = useState('');
  const [memberError, setMemberError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.isAdmin) {
          setIsAdmin(true);
          loadRoles();
        } else {
          setIsAdmin(false);
        }
      })
      .catch(() => setIsAdmin(false));
  }, []);

  const loadRoles = async () => {
    const res = await fetch('/api/roles');
    const data = await res.json();
    setRoles(data);
    if (data.length > 0 && !selectedRole) {
      setSelectedRole(data[0]);
      loadMembers(data[0].id);
    }
  };

  const loadMembers = async (roleId: string) => {
    const res = await fetch(`/api/roles/assign?roleId=${roleId}`);
    const data = await res.json();
    setMembers(data);
  };

  const selectRole = (role: Role) => {
    setSelectedRole(role);
    setMemberError('');
    loadMembers(role.id);
  };

  const addMember = async () => {
    if (!addUsername.trim() || !selectedRole) return;
    setMemberError('');
    const res = await fetch('/api/roles/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: addUsername.trim(), roleId: selectedRole.id }),
    });
    if (!res.ok) {
      const err = await res.json();
      setMemberError(err.error || 'Failed to add member');
      return;
    }
    setAddUsername('');
    loadMembers(selectedRole.id);
  };

  const removeMember = async (userId: string) => {
    if (!selectedRole) return;
    await fetch('/api/roles/assign', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, roleId: selectedRole.id }),
    });
    loadMembers(selectedRole.id);
  };

  const createRole = async () => {
    if (!newRoleName.trim()) return;
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newRoleName.trim(), color: '#8E8E8E', priority: 0,
        permissions: { send_messages: true, delete_messages: false, manage_channels: false, manage_roles: false, ban_users: false, kick_users: false, manage_word_filter: false, manage_badges: false },
      }),
    });
    const role = await res.json();
    setRoles((prev) => [...prev, role]);
    setSelectedRole(role);
    setNewRoleName('');
  };

  const saveRole = async () => {
    if (!selectedRole) return;
    setSaving(true);
    await fetch('/api/roles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedRole),
    });
    setSaving(false);
  };

  const deleteRole = async (id: string) => {
    await fetch('/api/roles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setRoles((prev) => prev.filter((r) => r.id !== id));
    if (selectedRole?.id === id) setSelectedRole(null);
  };

  if (isAdmin === null) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div style={{
        maxWidth: 400, margin: '4rem auto', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
      }}>
        <ShieldAlert size={40} style={{ color: 'var(--danger)' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Access Denied</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          You don't have permission to manage roles.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem' }}>Role Management</h1>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div style={{ width: 200, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input type="text" placeholder="New role..." value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} style={{ flex: 1, fontSize: '0.8rem', padding: '6px 10px' }} />
            <button onClick={createRole} className="btn-primary" style={{ padding: '6px 10px' }}><Plus size={14} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {roles.map((role) => (
              <button key={role.id} onClick={() => selectRole(role)} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 6,
                background: selectedRole?.id === role.id ? 'var(--accent-muted)' : 'transparent', color: role.color,
                fontSize: '0.85rem', fontWeight: selectedRole?.id === role.id ? 600 : 400, width: '100%', textAlign: 'left',
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: role.color }} />
                {role.name}
              </button>
            ))}
          </div>
        </div>

        {selectedRole && (
          <div style={{ flex: 1 }}>
            <div className="card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>Role Name</label>
                  <input type="text" value={selectedRole.name} onChange={(e) => setSelectedRole({ ...selectedRole, name: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>Color</label>
                    <input type="color" value={selectedRole.color} onChange={(e) => setSelectedRole({ ...selectedRole, color: e.target.value })} style={{ width: 48, height: 36, padding: 2, cursor: 'pointer' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>Priority</label>
                    <input type="number" value={selectedRole.priority} onChange={(e) => setSelectedRole({ ...selectedRole, priority: parseInt(e.target.value) || 0 })} style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Permissions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {Object.entries(permissionLabels).map(([key, label]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'var(--bg-tertiary)', cursor: 'pointer' }}>
                        <span style={{ fontSize: '0.85rem' }}>{label}</span>
                        <input type="checkbox" checked={selectedRole.permissions[key] || false}
                          onChange={(e) => setSelectedRole({ ...selectedRole, permissions: { ...selectedRole.permissions, [key]: e.target.checked } })}
                          style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Members</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Username..."
                      value={addUsername}
                      onChange={(e) => setAddUsername(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addMember()}
                      style={{ flex: 1, fontSize: '0.8rem', padding: '6px 10px' }}
                    />
                    <button onClick={addMember} className="btn-primary" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <UserPlus size={14} />
                    </button>
                  </div>
                  {memberError && (
                    <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginBottom: '0.5rem' }}>{memberError}</p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: 200, overflowY: 'auto' }}>
                    {members.length === 0 && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem' }}>No members with this role</p>
                    )}
                    {members.map((m: any) => (
                      <div key={m.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.4rem 0.75rem', borderRadius: 6, background: 'var(--bg-tertiary)',
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-secondary)',
                          overflow: 'hidden', flexShrink: 0,
                        }}>
                          {m.avatar_url && <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <span style={{ flex: 1, fontSize: '0.82rem' }}>{m.display_name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{m.username}</span>
                        <button onClick={() => removeMember(m.id)} style={{
                          background: 'none', padding: 2, color: 'var(--text-muted)',
                          cursor: 'pointer', border: 'none', display: 'flex',
                        }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={saveRole} className="btn-primary" disabled={saving}>
                    <Save size={14} style={{ marginRight: 6 }} />{saving ? 'Saving...' : 'Save Role'}
                  </button>
                  {selectedRole.name !== '@everyone' && (
                    <button onClick={() => deleteRole(selectedRole.id)} className="btn-danger">
                      <Trash2 size={14} style={{ marginRight: 6 }} />Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
