import os
os.chdir('src/app')
def edit(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (p, a[:40])
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)

edit('services/auth.service.ts', [("  /** Leaving the reset flow without", """  /** Settings: change the password of the signed-in account (the current one must be right). */
  async changePassword(current: string, next: string): Promise<AuthResult> {
    const user = this.userState();
    if (!user || user.role === 'guest') return { ok: false, message: 'Please log in first.' };
    if (!current) return { ok: false, message: 'Enter your current password.' };
    if (next.length < 8) return { ok: false, message: 'New password must be at least 8 characters.' };
    if (next === current) return { ok: false, message: 'Choose a password different from your current one.' };

    if (!this.backend.enabled) {
      const accounts = this.getStoredAccounts();
      const account = accounts.find((a) => a.email === user.email);
      if (account?.password && account.password !== current) {
        return { ok: false, message: 'Your current password is incorrect.' };
      }
      save(USERS_KEY, accounts.map((a) => (a.email === user.email ? { ...a, password: next } : a)));
      return { ok: true, message: 'Password updated.' };
    }

    const check = await this.backend.client.auth.signInWithPassword({ email: user.email, password: current });
    if (check.error) return { ok: false, message: 'Your current password is incorrect.' };
    const { error } = await this.backend.client.auth.updateUser({ password: next });
    if (error) return { ok: false, message: friendly(error.message) };
    return { ok: true, message: 'Password updated.' };
  }

  /** Leaving the reset flow without""")])

s = open('guards/access.guard.ts', encoding='utf-8').read()
s += """
/** Pages every role may open (settings): any session at all, no role redirects. */
export const sessionGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;

  return auth.hasSession() ? true : router.createUrlTree(['/welcome']);
};
"""
open('guards/access.guard.ts', 'w', encoding='utf-8').write(s)

edit('app.routes.ts', [("resetGuard, riderGuard }", "resetGuard, riderGuard, sessionGuard }"),
 ("  // Rider only: orders", """  // Settings: every role (guests get a reduced version).
  {
    path: 'settings',
    canActivate: [sessionGuard],
    loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },

  // Rider only: orders""")])

edit('app.component.ts', [
 ("        { label: 'Help & Support', url: '/help', icon: 'help-circle-outline', roles: ['guest', 'user'] },",
  "        { label: 'Help & Support', url: '/help', icon: 'help-circle-outline', roles: ['guest', 'user'] },\n        { label: 'Settings', url: '/settings', icon: 'settings-outline', roles: ['guest', 'user'] },"),
 ("        { label: 'My profile', url: '/rider/profile', icon: 'person-circle-outline', roles: ['rider'] },",
  "        { label: 'My profile', url: '/rider/profile', icon: 'person-circle-outline', roles: ['rider'] },\n        { label: 'Settings', url: '/settings', icon: 'settings-outline', roles: ['rider'] },"),
 ("        { label: 'Reviews', url: '/admin/reviews', icon: 'chatbubble-ellipses-outline', roles: ['admin'] },",
  "        { label: 'Reviews', url: '/admin/reviews', icon: 'chatbubble-ellipses-outline', roles: ['admin'] },\n        { label: 'Settings', url: '/settings', icon: 'settings-outline', roles: ['admin'] },"),
])
