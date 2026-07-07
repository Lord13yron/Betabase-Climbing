// Ported from the website so mobile enforces the same rules:
// app/onboarding/actions.ts (username) and general email shape.

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

// Handles we never hand out (routes, system words). Lowercase.
export const RESERVED = new Set([
  'admin', 'betabase', 'root', 'support', 'help', 'api', 'about',
  'login', 'signup', 'logout', 'settings', 'onboarding', 'profile',
]);

// Loose email shape for a fast client-side gate; Supabase is the real check.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}
