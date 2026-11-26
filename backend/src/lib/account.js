export const ACCOUNT_FIELDS = `
  a.id, a.username, a.email, a.display_name, a.role_code, a.parent_id, a.referred_by,
  a.referral_code, a.status, a.balance, a.xp, a.level, a.country, a.phone,
  a.avatar_seed, a.two_factor_enabled, a.marketing_opt_in, a.suspended_reason,
  a.last_login_at, a.created_at, a.updated_at, a.auth_provider, a.email_verified,
  (a.firebase_uid IS NOT NULL) AS firebase_linked,
  r.name AS role_name, r.rank AS role_rank, r.permissions AS role_permissions
`;

export function serializeAccount(row) {
  if (!row) return null;
  const balance = Number(row.balance);
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    role: row.role_code,
    roleName: row.role_name,
    roleRank: row.role_rank,
    permissions: Array.isArray(row.role_permissions) ? row.role_permissions : [],
    parentId: row.parent_id,
    referredBy: row.referred_by,
    referralCode: row.referral_code,
    status: row.status,
    balance,
    xp: row.xp,
    level: row.level,
    country: row.country,
    phone: row.phone,
    avatarSeed: row.avatar_seed,
    twoFactorEnabled: row.two_factor_enabled,
    marketingOptIn: row.marketing_opt_in,
    authProvider: row.auth_provider || "password",
    emailVerified: row.email_verified !== false,
    firebaseLinked: !!row.firebase_linked,
    suspendedReason: row.suspended_reason,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function publicAccount(row) {
  const account = serializeAccount(row);
  if (!account) return null;
  const { email, phone, permissions, ...rest } = account;
  return rest;
}
