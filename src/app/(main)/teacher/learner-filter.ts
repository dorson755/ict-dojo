const NON_LEARNER_ROLES = new Set(['teacher', 'admin', 'parent']);

export interface RoleAware {
  id: string;
  role?: string;
  email?: string;
}

/**
 * Profiles carry no reliable role (many have none), so a learner is anyone who
 * is not explicitly staff. The reserved .test domain marks developer accounts.
 */
export function isLearnerProfile(profile: RoleAware): boolean {
  if (profile.role && NON_LEARNER_ROLES.has(profile.role)) return false;
  if (profile.email && /@[^@]+\.test$/i.test(profile.email) && /teacher|principal|admin/i.test(profile.email)) return false;
  return true;
}
