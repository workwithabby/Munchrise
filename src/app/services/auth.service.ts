import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import { SavedAddress, SavedPayment, User, UserRole } from '../models/user.model';
import { load, makeId, save, remove } from './storage';
import { SupabaseService } from './supabase.service';

const USER_KEY = 'munchrise.user';
const USERS_KEY = 'munchrise.accounts';
const GUEST_KEY = 'munchrise.guest';
/** Set while someone has typed a correct reset code but not yet chosen a new password. */
const RESET_KEY = 'munchrise.resetPending';

export interface AuthResult {
  ok: boolean;
  message: string;
  /** The account exists but its email still needs the 6-digit code. */
  needsVerification?: boolean;
}

interface StoredAccount {
  id: string;
  name: string;
  email: string;
  /** Demo only (local mode) — only saved so the fake login can check it. */
  password?: string;
  /** Older saved accounts may not have one yet — they become 'user'. */
  role?: UserRole;
}

const GUEST: User = { id: 'guest', name: 'Guest', email: '', role: 'guest', addresses: [], payments: [] };

/**
 * Older demo sessions stored `isGuest` instead of `role` — convert them so
 * a refresh after updating the app keeps people signed in.
 */
function normalizeSession(stored: User | null): User | null {
  if (!stored) return null;
  if (stored.role) return stored;

  const legacy = stored as User & { isGuest?: boolean };
  return { ...stored, role: legacy.isGuest ? 'guest' : 'user' };
}

/** Turns Supabase's English errors into short messages for the screen. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Wrong email or password. Please try again.';
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'An account with that email already exists.';
  }
  if (m.includes('email not confirmed')) {
    return 'Please confirm your email first. Check your inbox for the message from Munchrise.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (m.includes('different from the old') || m.includes('same as the old')) {
    return 'Choose a password that is different from your old one.';
  }
  if (m.includes('password') && m.includes('characters')) return 'Password must be at least 8 characters.';
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'No internet connection. Please try again.';
  }
  return message;
}

/**
 * Accounts and the signed-in session.
 *
 * - Backend mode (the real app): Supabase Auth + the `profiles`, `addresses` and
 *   `payment_methods` tables. Roles come from the server and can never be set here.
 * - Local mode (unit tests, no backend): the old localStorage demo accounts.
 *
 * `ready` resolves once the saved session has been looked up, so route guards can
 * wait for it before deciding where to send someone.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly backend = inject(SupabaseService);

  private readonly userState = signal<User | null>(
    this.backend.enabled ? null : normalizeSession(load<User | null>(USER_KEY, null)),
  );

  /** The account whose reset code was just verified and who now has to pick a new password. */
  private readonly recoveryUser = signal<string | null>(null);

  /** True between a correct reset code and the new password being saved. */
  readonly resetPending = computed(() => this.recoveryUser() !== null);

  /** Resolves when the saved session has been restored. */
  readonly ready: Promise<void>;

  /** The signed-in session (user, admin, rider or guest), or null when signed out. */
  readonly user = this.userState.asReadonly();

  /** Any saved session at all — even "Continue as Guest". */
  readonly hasSession = computed(() => this.userState() !== null);

  /** A real account is signed in (a guest is NOT logged in). */
  readonly isLoggedIn = computed(() => {
    const current = this.userState();
    return current !== null && current.role !== 'guest';
  });

  readonly isGuest = computed(() => this.userState()?.role === 'guest');
  readonly isUser = computed(() => this.userState()?.role === 'user');
  readonly isAdmin = computed(() => this.userState()?.role === 'admin');
  readonly isRider = computed(() => this.userState()?.role === 'rider');

  /** Where this person lands after signing in or opening the app. */
  readonly homePath = computed(() => {
    const role = this.userState()?.role;
    return role === 'admin' ? '/admin' : role === 'rider' ? '/rider' : '/home';
  });

  /** Text shown at the top of the side menu. */
  readonly displayName = computed(() => this.userState()?.name ?? 'Guest');

  constructor() {
    this.ready = this.backend.enabled ? this.restoreSession() : Promise.resolve();
  }

  // ---------------------------------------------------------------- sign up / in / out

  async signUp(firstName: string, lastName: string, email: string, password: string): Promise<AuthResult> {
    const first = firstName.trim();
    const last = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const fullName = [first, last].filter(Boolean).join(' ');

    if (!first) return { ok: false, message: 'Please enter your first name.' };
    if (!cleanEmail.includes('@')) return { ok: false, message: 'Please enter a valid email.' };
    if (password.length < 8) return { ok: false, message: 'Password must be at least 8 characters.' };

    if (!this.backend.enabled) return this.localSignUp(first, last, fullName, cleanEmail, password);

    const sb = this.backend.client;
    const { data, error } = await sb.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { first_name: first, last_name: last, name: fullName } },
    });
    if (error) return { ok: false, message: friendly(error.message) };

    // With "Confirm email" on, an existing address comes back as a fake user with no identities.
    if (data.user && (data.user.identities?.length ?? 1) === 0) {
      return { ok: false, message: 'An account with that email already exists.' };
    }

    // "Confirm email" off: we get a session straight away.
    if (data.session) {
      await this.loadProfile(data.session.user.id);
      return { ok: true, message: `Welcome, ${first}!` };
    }

    // "Confirm email" is on: Supabase emailed a 6-digit code that must be entered before login.
    return {
      ok: false,
      needsVerification: true,
      message: `We sent a 6-digit code to ${cleanEmail}.`,
    };
  }

  /** Step 2 of sign up: the 6-digit code from the email confirms the account and signs the person in. */
  async verifyOtp(email: string, code: string): Promise<AuthResult> {
    const cleanEmail = email.trim().toLowerCase();
    const token = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(token)) return { ok: false, message: 'Enter the 6-digit code from your email.' };
    if (!this.backend.enabled) return { ok: false, message: 'Email codes need the online backend.' };

    const { data, error } = await this.backend.client.auth.verifyOtp({ email: cleanEmail, token, type: 'signup' });
    if (error || !data.user) {
      const m = (error?.message ?? '').toLowerCase();
      if (m.includes('expired') || m.includes('invalid')) {
        return { ok: false, message: 'That code is wrong or has expired. Request a new one.' };
      }
      return { ok: false, message: friendly(error?.message ?? 'Could not verify the code.') };
    }

    remove(GUEST_KEY);
    await this.loadProfile(data.user.id);
    const name = this.userState()?.firstName || this.userState()?.name || 'there';
    return { ok: true, message: `Welcome, ${name}!` };
  }

  /**
   * Forgot password, step 1: emails a 6-digit code. The answer is the same whether or not the
   * address has an account, so this can never be used to find out who is registered.
   */
  async requestPasswordReset(email: string): Promise<AuthResult> {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, message: 'Please enter a valid email.' };
    if (!this.backend.enabled) return { ok: false, message: 'Password reset needs the online backend.' };

    const { error } = await this.backend.client.auth.resetPasswordForEmail(cleanEmail);
    if (error) return { ok: false, message: friendly(error.message) };
    return { ok: true, message: `If ${cleanEmail} has an account, a 6-digit code is on its way.` };
  }

  /**
   * Forgot password, step 2: checks the emailed code. A correct code gives a short-lived session
   * that may do exactly one thing, choose a new password (`saveNewPassword`). Until then nobody is
   * signed in, and leaving the reset flow discards that session (`cancelPasswordReset`).
   */
  async verifyResetCode(email: string, code: string): Promise<AuthResult> {
    const cleanEmail = email.trim().toLowerCase();
    const token = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(token)) return { ok: false, message: 'Enter the 6-digit code from your email.' };
    if (!this.backend.enabled) return { ok: false, message: 'Password reset needs the online backend.' };

    const { data, error } = await this.backend.client.auth.verifyOtp({ email: cleanEmail, token, type: 'recovery' });
    if (error || !data.user) {
      const m = (error?.message ?? '').toLowerCase();
      if (m.includes('expired') || m.includes('invalid')) {
        return { ok: false, message: 'That code is wrong or has expired. Request a new one.' };
      }
      return { ok: false, message: friendly(error?.message ?? 'Could not verify the code.') };
    }

    this.recoveryUser.set(data.user.id);
    save(RESET_KEY, true);
    return { ok: true, message: 'Code verified. Now choose a new password.' };
  }

  /** Forgot password, step 3: saves the new password (only after a correct code) and signs the person in. */
  async saveNewPassword(newPassword: string): Promise<AuthResult> {
    const id = this.recoveryUser();
    if (!id || !this.backend.enabled) return { ok: false, message: 'Your reset session ended. Please start again.' };
    if (newPassword.length < 8) return { ok: false, message: 'Password must be at least 8 characters.' };

    const { error } = await this.backend.client.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, message: friendly(error.message) };

    this.recoveryUser.set(null);
    remove(RESET_KEY);
    remove(GUEST_KEY);
    await this.loadProfile(id);
    const name = this.userState()?.firstName || this.userState()?.name || 'back';
    return { ok: true, message: `Password updated. Welcome back, ${name}!` };
  }

  /** Settings: change the password of the signed-in account (the current one must be right). */
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

  /** Leaving the reset flow without choosing a password: throw the temporary session away. */
  async cancelPasswordReset(): Promise<void> {
    if (!this.recoveryUser()) return;
    this.recoveryUser.set(null);
    remove(RESET_KEY);
    if (this.backend.enabled) await this.backend.client.auth.signOut();
  }

  /** Sends a fresh 6-digit code to an account that is not confirmed yet. */
  async resendCode(email: string): Promise<AuthResult> {
    const cleanEmail = email.trim().toLowerCase();
    if (!this.backend.enabled) return { ok: false, message: 'Email codes need the online backend.' };

    const { error } = await this.backend.client.auth.resend({ type: 'signup', email: cleanEmail });
    if (error) return { ok: false, message: friendly(error.message) };
    return { ok: true, message: `A new code is on its way to ${cleanEmail}.` };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) return { ok: false, message: 'Please enter a valid email.' };
    if (password.length < 8) return { ok: false, message: 'Password must be at least 8 characters.' };

    if (!this.backend.enabled) return this.localLogin(cleanEmail, password);

    const { data, error } = await this.backend.client.auth.signInWithPassword({ email: cleanEmail, password });
    if (error && error.message.toLowerCase().includes('email not confirmed')) {
      // They never entered their code: send a new one and let the screen open the code step.
      void this.backend.client.auth.resend({ type: 'signup', email: cleanEmail });
      return { ok: false, needsVerification: true, message: 'Please confirm your email with the 6-digit code we just sent.' };
    }
    if (error || !data.user) return { ok: false, message: friendly(error?.message ?? 'Could not log in.') };

    remove(GUEST_KEY);
    await this.loadProfile(data.user.id);
    const name = this.userState()?.firstName || this.userState()?.name || 'back';
    return { ok: true, message: `Welcome back, ${name}!` };
  }

  /** Browse the app without an account. */
  continueAsGuest(): AuthResult {
    if (this.backend.enabled) {
      save(GUEST_KEY, true);
      this.userState.set(GUEST);
    } else {
      this.persist(GUEST);
    }
    return { ok: true, message: 'Browsing as guest.' };
  }

  /** Clears the session and sends the person back to the landing page. */
  async logout(): Promise<void> {
    this.userState.set(null);
    remove(USER_KEY);
    remove(GUEST_KEY);
    if (this.backend.enabled) {
      await this.backend.client.auth.signOut();
    }
    void this.router.navigateByUrl('/welcome', { replaceUrl: true });
  }

  // ---------------------------------------------------------------- profile

  /** Saves profile edits (name, phone, avatar, addresses, payment methods). */
  updateProfile(patch: Partial<User>): void {
    const current = this.userState();
    if (!current) return;

    const next: User = { ...current, ...patch };
    this.persist(next);

    if (this.backend.enabled && current.role !== 'guest') {
      const columns: Record<string, unknown> = {};
      if (patch.name !== undefined) columns['name'] = patch.name;
      if (patch.firstName !== undefined) columns['first_name'] = patch.firstName;
      if (patch.lastName !== undefined) columns['last_name'] = patch.lastName;
      if (patch.phone !== undefined) columns['phone'] = patch.phone;
      if (patch.avatar !== undefined) columns['avatar'] = patch.avatar;

      if (Object.keys(columns).length > 0) {
        void this.backend.client
          .from('profiles')
          .update(columns)
          .eq('id', current.id)
          .then(({ error }) => {
            // The server said no: show what it really has.
            if (error) void this.loadProfile(current.id);
          });
      }
    }
  }

  async addAddress(address: Omit<SavedAddress, 'id'>): Promise<void> {
    const current = this.userState();
    if (!current) return;

    if (this.backend.enabled && current.role !== 'guest') {
      const { data, error } = await this.backend.client
        .from('addresses')
        .insert({ user_id: current.id, label: address.label, line: address.line, city: address.city })
        .select()
        .single();
      if (error || !data) return;
      this.persist({ ...current, addresses: [...current.addresses, { id: data.id, label: data.label, line: data.line, city: data.city }] });
      return;
    }

    this.persist({ ...current, addresses: [...current.addresses, { ...address, id: makeId('addr') }] });
  }

  async removeAddress(id: string): Promise<void> {
    const current = this.userState();
    if (!current) return;

    this.persist({ ...current, addresses: current.addresses.filter((a) => a.id !== id) });
    if (this.backend.enabled && current.role !== 'guest') {
      await this.backend.client.from('addresses').delete().eq('id', id);
    }
  }

  async addPayment(payment: Omit<SavedPayment, 'id'>): Promise<void> {
    const current = this.userState();
    if (!current) return;

    if (this.backend.enabled && current.role !== 'guest') {
      const { data, error } = await this.backend.client
        .from('payment_methods')
        .insert({ user_id: current.id, label: payment.label, type: payment.type, masked: payment.masked })
        .select()
        .single();
      if (error || !data) return;
      this.persist({
        ...current,
        payments: [...current.payments, { id: data.id, label: data.label, type: data.type, masked: data.masked }],
      });
      return;
    }

    this.persist({ ...current, payments: [...current.payments, { ...payment, id: makeId('pay') }] });
  }

  async removePayment(id: string): Promise<void> {
    const current = this.userState();
    if (!current) return;

    this.persist({ ...current, payments: current.payments.filter((p) => p.id !== id) });
    if (this.backend.enabled && current.role !== 'guest') {
      await this.backend.client.from('payment_methods').delete().eq('id', id);
    }
  }

  // ---------------------------------------------------------------- backend helpers

  /** On app start: pick up a saved Supabase session (or the guest flag). */
  private async restoreSession(): Promise<void> {
    const sb = this.backend.client;
    try {
      // The app was closed halfway through a password reset: that temporary session must not log anyone in.
      if (load<boolean>(RESET_KEY, false)) {
        remove(RESET_KEY);
        await sb.auth.signOut();
      }
      const { data } = await sb.auth.getSession();
      if (data.session) {
        await this.loadProfile(data.session.user.id);
      } else if (load<boolean>(GUEST_KEY, false)) {
        this.userState.set(GUEST);
      }
    } catch {
      // Offline at start: the person simply starts signed out.
    }

    // Signed out somewhere else (or the session expired).
    sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && this.userState()?.role !== 'guest') {
        setTimeout(() => this.userState.set(null));
      }
    });
  }

  /** Reads the profile, saved addresses and saved payment methods of one user. */
  private async loadProfile(id: string): Promise<void> {
    const sb = this.backend.client;
    const [profile, addresses, payments] = await Promise.all([
      sb.from('profiles').select('*').eq('id', id).single(),
      sb.from('addresses').select('*').eq('user_id', id).order('created_at'),
      sb.from('payment_methods').select('*').eq('user_id', id).order('created_at'),
    ]);

    if (profile.error || !profile.data) {
      this.userState.set(null);
      return;
    }

    const p = profile.data;
    this.userState.set({
      id: p.id,
      name: p.name || p.email,
      firstName: p.first_name,
      lastName: p.last_name,
      email: p.email ?? '',
      phone: p.phone ?? undefined,
      avatar: p.avatar ?? undefined,
      role: p.role as UserRole,
      addresses: (addresses.data ?? []).map((a) => ({ id: a.id, label: a.label, line: a.line, city: a.city })),
      payments: (payments.data ?? []).map((x) => ({ id: x.id, label: x.label, type: x.type, masked: x.masked })),
    });
  }

  // ---------------------------------------------------------------- local mode (tests / no backend)

  private localSignUp(first: string, last: string, fullName: string, email: string, password: string): AuthResult {
    if (this.getAccounts().some((a) => a.email === email)) {
      return { ok: false, message: 'An account with that email already exists.' };
    }

    // Sign up can only ever create a normal user — never an admin.
    const account: StoredAccount = { id: makeId('user'), name: fullName, email, password, role: 'user' };
    save(USERS_KEY, [...this.getStoredAccounts(), account]);

    this.setSignedInUser(fullName, email, 'user', first, last);
    return { ok: true, message: `Welcome, ${first}!` };
  }

  private localLogin(email: string, password: string): AuthResult {
    const account = this.getAccounts().find((a) => a.email === email);

    if (!account) return { ok: false, message: 'No account found. Please sign up first.' };
    // Accounts from older demos have no saved password — only check when we have one.
    if (account.password && account.password !== password) {
      return { ok: false, message: 'Incorrect password. Please try again.' };
    }

    this.setSignedInUser(account.name, account.email, account.role ?? 'user');
    return { ok: true, message: `Welcome back, ${account.name}!` };
  }

  private setSignedInUser(name: string, email: string, role: UserRole, firstName?: string, lastName?: string): void {
    const existing = this.userState();
    const user: User = {
      id: existing && existing.role !== 'guest' ? existing.id : makeId('user'),
      name,
      firstName,
      lastName,
      email,
      role,
      addresses: existing?.addresses ?? [],
      payments: existing?.payments ?? [],
      avatar: existing?.avatar,
      phone: existing?.phone,
    };
    this.persist(user);
  }

  private persist(user: User): void {
    this.userState.set(user);
    if (!this.backend.enabled) save(USER_KEY, user);
  }

  /** Accounts saved on this device (local mode only; unit tests seed their own). */
  private getAccounts(): StoredAccount[] {
    return this.getStoredAccounts();
  }

  private getStoredAccounts(): StoredAccount[] {
    return load<StoredAccount[]>(USERS_KEY, []).map((a) => ({
      ...a,
      role: a.role ?? 'user',
    }));
  }
}
