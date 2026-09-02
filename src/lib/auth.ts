/**
 * Email allowlist for sign-in, driven by the ALLOWED_EMAILS env var.
 *
 * ALLOWED_EMAILS is a comma-separated list of Google account emails, e.g.
 *   ALLOWED_EMAILS=you@gmail.com,partner@gmail.com
 * Set it to `*` to allow any authenticated Google account.
 *
 * Fails closed: if the variable is missing or empty, nobody can sign in.
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;

  const allowed = (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) {
    console.warn(
      '[Auth] ALLOWED_EMAILS is not set - all sign-ins are rejected. ' +
        'Add your email to ALLOWED_EMAILS in .env (see .env.example).'
    );
    return false;
  }

  if (allowed.includes('*')) return true;

  return allowed.includes(email.toLowerCase());
}
