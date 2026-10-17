import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

describe('AuthService', () => {
  let auth: AuthService;

  beforeEach(() => {
    localStorage.removeItem('munchrise.user');
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
  });

  it('starts as guest text when signed out', async () => {
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.displayName()).toBe('Guest');
  });

  it('signs up and keeps the user signed in', async () => {
    const result = await auth.signUp('Abigail Dela Cruz', '', 'abi@example.com', 'secret123');

    expect(result.ok).toBe(true);
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.displayName()).toBe('Abigail Dela Cruz');
  });

  it('sign up creates a normal user, never an admin', async () => {
    auth.signUp('Abi', '', 'abi@example.com', 'secret123');

    expect(auth.isUser()).toBe(true);
    expect(auth.isAdmin()).toBe(false);
    expect(auth.isGuest()).toBe(false);
  });

  it('refuses a short password', async () => {
    const result = await auth.signUp('Abi', '', 'abi@example.com', '123');
    expect(result.ok).toBe(false);
  });

  it('logs in with a registered email', async () => {
    auth.signUp('John Steven', '', 'steven@example.com', 'secret123');
    auth.logout();

    const result = await auth.login('steven@example.com', 'secret123');
    expect(result.ok).toBe(true);
    expect(auth.displayName()).toBe('John Steven');
  });

  it('rejects an unknown email', async () => {
    const result = await auth.login('nobody@example.com', 'secret123');
    expect(result.ok).toBe(false);
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('logs in as the seeded demo admin', async () => {
    const result = await auth.login('admin@munchrise.com', 'Admin123!');

    expect(result.ok).toBe(true);
    expect(auth.isAdmin()).toBe(true);
    expect(auth.isLoggedIn()).toBe(true);
  });

  it('logs in as the seeded demo rider', async () => {
    const result = await auth.login('rider@munchrise.com', 'Rider123!');

    expect(result.ok).toBe(true);
    expect(auth.isRider()).toBe(true);
    expect(auth.homePath()).toBe('/rider');
  });

  it('rejects a wrong admin password', async () => {
    const result = await auth.login('admin@munchrise.com', 'wrongpass');

    expect(result.ok).toBe(false);
    expect(auth.isAdmin()).toBe(false);
  });

  it('does not allow sign up with the admin email', async () => {
    const result = await auth.signUp('Sneaky', '', 'admin@munchrise.com', 'secret123');

    expect(result.ok).toBe(false);
    expect(auth.isAdmin()).toBe(false);
  });

  it('can continue as guest', async () => {
    auth.continueAsGuest();

    expect(auth.isGuest()).toBe(true);
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.hasSession()).toBe(true);
    expect(auth.displayName()).toBe('Guest');
  });

  it('signs out and forgets the user', async () => {
    auth.signUp('Abi', '', 'abi@example.com', 'secret123');
    auth.logout();

    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.user()).toBeNull();
    expect(auth.hasSession()).toBe(false);
  });
});

describe('AuthService password reset (online mode)', () => {
  function setup(authApi: Record<string, unknown>) {
    const profileRow = { id: 'u1', email: 'abi@example.com', first_name: 'Abi', last_name: '', name: 'Abi', role: 'user' };
    const table = (rows: unknown) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: rows, error: null }),
          order: async () => ({ data: [], error: null }),
        }),
      }),
    });
    const client = {
      auth: authApi,
      from: (name: string) => table(name === 'profiles' ? profileRow : []),
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SupabaseService, useValue: { enabled: true, client } },
      ],
    });
    return TestBed.inject(AuthService);
  }

  const noSession = { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) };

  it('asks for a valid email before contacting the server', async () => {
    const resetPasswordForEmail = vi.fn();
    const auth = setup({ ...noSession, resetPasswordForEmail });

    const result = await auth.requestPasswordReset('nope');

    expect(result.ok).toBe(false);
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('sends the code and never reveals whether the account exists', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    const auth = setup({ ...noSession, resetPasswordForEmail });

    const result = await auth.requestPasswordReset('  Abi@Example.com ');

    expect(resetPasswordForEmail).toHaveBeenCalledWith('abi@example.com');
    expect(result.ok).toBe(true);
    expect(result.message).toContain('If abi@example.com has an account');
  });

  it('turns a rate-limit error into a friendly message', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: { message: 'email rate limit exceeded' } });
    const auth = setup({ ...noSession, resetPasswordForEmail });

    const result = await auth.requestPasswordReset('abi@example.com');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Too many attempts');
  });

  it('a correct code unlocks the new-password step but does not sign anyone in yet', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const auth = setup({ ...noSession, verifyOtp });

    const result = await auth.verifyResetCode('abi@example.com', '123456');

    expect(verifyOtp).toHaveBeenCalledWith({ email: 'abi@example.com', token: '123456', type: 'recovery' });
    expect(result.ok).toBe(true);
    expect(auth.resetPending()).toBe(true);
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('saves the new password and signs the person in after a correct code', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const updateUser = vi.fn().mockResolvedValue({ error: null });
    const auth = setup({ ...noSession, verifyOtp, updateUser });

    await auth.verifyResetCode('abi@example.com', '123456');
    const result = await auth.saveNewPassword('newpass123');

    expect(updateUser).toHaveBeenCalledWith({ password: 'newpass123' });
    expect(result.ok).toBe(true);
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.resetPending()).toBe(false);
  });

  it('refuses to set a password without a verified code first', async () => {
    const updateUser = vi.fn();
    const auth = setup({ ...noSession, updateUser });

    const result = await auth.saveNewPassword('newpass123');

    expect(result.ok).toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('does not unlock anything when the code is wrong', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Token has expired or is invalid' } });
    const auth = setup({ ...noSession, verifyOtp });

    const result = await auth.verifyResetCode('abi@example.com', '000000');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('wrong or has expired');
    expect(auth.resetPending()).toBe(false);
  });

  it('signs the temporary session out when the reset is cancelled', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const auth = setup({ ...noSession, verifyOtp, signOut });

    await auth.verifyResetCode('abi@example.com', '123456');
    await auth.cancelPasswordReset();

    expect(signOut).toHaveBeenCalled();
    expect(auth.resetPending()).toBe(false);
  });

  it('rejects a malformed code before calling the server', async () => {
    const verifyOtp = vi.fn();
    const auth = setup({ ...noSession, verifyOtp });

    expect((await auth.verifyResetCode('abi@example.com', '12')).ok).toBe(false);
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});
