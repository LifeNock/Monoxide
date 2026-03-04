'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('roles')
      .select('*')
      .order('priority', { ascending: false });
    if (data) {
      setRoles(data);
      if (data.length > 0 && !selectedRole) {
        setSelectedRole(data[0]);
      }
    }
  };

  const createRole = async () => {
    if (!newRoleName.trim()) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('roles').insert({
      name: newRoleName.trim(),
      color: '#8E8E8E',
      priority: 0,
      permissions: {
        send_messages: true,
        delete_messages: false,
        manage_channels: false,
        manage_roles: false,
        ban_users: false,
        kick_users: false,
        manage_word_filter: false,
        manage_badges: false,
      },
    }).select().single();

    if (data) {
      setRoles((prev) => [...prev, data]);
      setSelectedRole(data);
      setNewRoleName('');
    }
  };

  const saveRole = async () => {
    if (!selectedRole) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from('roles').update({
      name: selectedRole.name,
      color: selectedRole.color,
      priority: selectedRole.priority,
      permissions: selectedRole.permissions,
    }).eq('id', selectedRole.id);
    setSaving(false);
  };

  const deleteRole = async (id: string) => {
    const supabase = createClient();
    await supabase.from('roles').delete().eq('id', id);
    setRoles((prev) => prev.filter((r) => r.id !== id));
    if (selectedRole?.id === id) setSelectedRole(null);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem' }}>Role Management</h1>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        {/* Role list */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              type="text"
              placeholder="New role..."
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              style={{ flex: 1, fontSize: '0.8rem', padding: '6px 10px' }}
            />
            <button
              onClick={createRole}
              className="btn-primary"
              style={{ padding: '6px 10px' }}
            >
              <Plus size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 6,
                  background: selectedRole?.id === role.id ? 'var(--accent-muted)' : 'transparent',
                  color: role.color,
                  fontSize: '0.85rem',
                  fontWeight: selectedRole?.id === role.id ? 600 : 400,
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: role.color }} />
                {role.name}
              </button>
            ))}
          </div>
        </div>

        {/* Role editor */}
        {selectedRole && (
          <div style={{ flex: 1 }}>
            <div className="card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={selectedRole.name}
                    onChange={(e) => setSelectedRole({ ...selectedRole, name: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>
                      Color
                    </label>
                    <input
                      type="color"
                      value={selectedRole.color}
                      onChange={(e) => setSelectedRole({ ...selectedRole, color: e.target.value })}
                      style={{ width: 48, height: 36, padding: 2, cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>
                      Priority
                    </label>
                    <input
                      type="number"
                      value={selectedRole.priority}
                      onChange={(e) => setSelectedRole({ ...selectedRole, priority: parseInt(e.target.value) || 0 })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Permissions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {Object.entries(permissionLabels).map(([key, label]) => (
                      <label
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 6,
                          background: 'var(--bg-tertiary)',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '0.85rem' }}>{label}</span>
                        <input
                          type="checkbox"
                          checked={selectedRole.permissions[key] || false}
                          onChange={(e) => {
                            setSelectedRole({
                              ...selectedRole,
                              permissions: { ...selectedRole.permissions, [key]: e.target.checked },
                            });
                          }}
                          style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={saveRole} className="btn-primary" disabled={saving}>
                    <Save size={14} style={{ marginRight: 6 }} />
                    {saving ? 'Saving...' : 'Save Role'}
                  </button>
                  {selectedRole.name !== '@everyone' && (
                    <button onClick={() => deleteRole(selectedRole.id)} className="btn-danger">
                      <Trash2 size={14} style={{ marginRight: 6 }} />
                      Delete
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
