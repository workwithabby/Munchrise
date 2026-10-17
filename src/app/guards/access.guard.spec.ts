import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ToastController } from '@ionic/angular';

import { adminGuard, authGuard, memberGuard, resetGuard } from './access.guard';
import { AuthService } from '../services/auth.service';

/** Minimal stand-ins so the guards can be called directly. */
const routeStub = {} as never;
const stateStub = { url: '/test' } as never;

describe('access guards', () => {
  let auth: AuthService;
  let router: Router;
  /** Fake toast controller that remembers the last message shown. */
  let toast: { lastMessage: string };

  beforeEach(() => {
    localStorage.removeItem('munchrise.user');

    toast = { lastMessage: '' };
    const fakeToastController = {
      create: async (options: { message: string }) => {
        toast.lastMessage = options.message;
        return { present: async () => {} };
      },
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ToastController, useValue: fakeToastController },
      ],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  describe('authGuard', () => {
    it('sends a visitor with no session to the landing page', async () => {
      const result = await TestBed.runInInjectionContext(() => authGuard(routeStub, stateStub));
      expect(result).toEqual(router.parseUrl('/welcome'));
    });

    it('lets a guest through', async () => {
      auth.continueAsGuest();
      const result = await TestBed.runInInjectionContext(() => authGuard(routeStub, stateStub));
      expect(result).toBe(true);
    });

    it('lets a signed-in user through', async () => {
      auth.signUp('Abi', '', 'abi@example.com', 'secret123');
      const result = await TestBed.runInInjectionContext(() => authGuard(routeStub, stateStub));
      expect(result).toBe(true);
    });
  });

  describe('memberGuard', () => {
    it('blocks a guest, shows the toast and sends them to /login', async () => {
      auth.continueAsGuest();

      const result = await TestBed.runInInjectionContext(() =>
        memberGuard(routeStub, stateStub),
      );

      expect(result).toEqual(router.parseUrl('/login'));
      expect(toast.lastMessage).toBe('Please sign up or log in first.');
    });

    it('lets a normal user through without a toast', async () => {
      auth.signUp('Abi', '', 'abi@example.com', 'secret123');

      const result = await TestBed.runInInjectionContext(() => memberGuard(routeStub, stateStub));

      expect(result).toBe(true);
      expect(toast.lastMessage).toBe('');
    });

    it('sends an admin to /admin (they only manage products)', async () => {
      auth.login('admin@munchrise.com', 'Admin123!');

      const result = await TestBed.runInInjectionContext(() => memberGuard(routeStub, stateStub));

      expect(result).toEqual(router.parseUrl('/admin'));
    });
  });

  describe('adminGuard', () => {
    it('sends a guest home', async () => {
      auth.continueAsGuest();
      const result = await TestBed.runInInjectionContext(() => adminGuard(routeStub, stateStub));
      expect(result).toEqual(router.parseUrl('/home'));
    });

    it('sends a normal user home', async () => {
      auth.signUp('Abi', '', 'abi@example.com', 'secret123');
      const result = await TestBed.runInInjectionContext(() => adminGuard(routeStub, stateStub));
      expect(result).toEqual(router.parseUrl('/home'));
    });

    it('lets the admin in', async () => {
      auth.login('admin@munchrise.com', 'Admin123!');
      const result = await TestBed.runInInjectionContext(() => adminGuard(routeStub, stateStub));
      expect(result).toBe(true);
    });
  });
});

describe('resetGuard', () => {
  it('sends anyone without a verified reset code back to Forgot password', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const router = TestBed.inject(Router);

    const result = await TestBed.runInInjectionContext(() => resetGuard(routeStub, stateStub));

    expect(result).toEqual(router.parseUrl('/forgot-password'));
  });
});
