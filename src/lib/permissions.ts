import { supabaseAdmin } from '@/lib/supabase';

export type Permission =
  | 'send_messages'
  | 'delete_messages'
  | 'manage_channels'
  | 'manage_roles'
  | 'ban_users'
  | 'kick_users'
  | 'manage_word_filter'
  | 'manage_badges'
  | 'mention_everyone';

const ADMIN_USERNAMES = ['lifenock'];

export async function getUserPermissions(userId: string): Promise<Set<Permission>> {
  const perms = new Set<Permission>();

  // Check if hardcoded admin — gets all permissions
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single();

  if (profile && ADMIN_USERNAMES.includes(profile.username?.toLowerCase())) {
    return new Set<Permission>([
      'send_messages', 'delete_messages', 'manage_channels',
      'manage_roles', 'ban_users', 'kick_users',
      'manage_word_filter', 'manage_badges', 'mention_everyone',
    ]);
  }

  // Fetch all roles for the user
  const { data: userRoles } = await supabaseAdmin
    .from('user_roles')
    .select('role:roles(permissions)')
    .eq('user_id', userId);

  if (userRoles) {
    for (const ur of userRoles) {
      const rolePerms = (ur.role as any)?.permissions;
      if (rolePerms && typeof rolePerms === 'object') {
        for (const [key, value] of Object.entries(rolePerms)) {
          if (value === true) perms.add(key as Permission);
        }
      }
    }
  }

  return perms;
}

export async function hasPermission(userId: string, permission: Permission): Promise<boolean> {
  const perms = await getUserPermissions(userId);
  return perms.has(permission);
}
