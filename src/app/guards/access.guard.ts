import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

import { AuthService } from '../services/auth.service';

/**
 * Any session counts — even "Continue as Guest".
 * With no session at all (fresh visitor), go to the landing page.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;

  if (auth.isAdmin()) return router.createUrlTree(['/admin']); // admins only manage products
  if (auth.isRider()) return router.createUrlTree(['/rider']); // riders only deliver
  return auth.hasSession() ? true : router.createUrlTree(['/welcome']);
};

/**
 * Pages that need a real account (cart, checkout, orders, ...).
 * A guest may look around the shop, but gets a friendly nudge to sign up.
 */
export const memberGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  // inject() only works before the first await
  const toastController = inject(ToastController);
  await auth.ready;

  if (auth.isAdmin()) return router.createUrlTree(['/admin']);
  if (auth.isRider()) return router.createUrlTree(['/rider']);
  if (auth.isUser()) return true;

  const toast = await toastController.create({
    message: 'Please sign up or log in first.',
    duration: 1800,
    position: 'bottom',
    color: 'primary',
  });
  await toast.present();

  return router.createUrlTree(['/login']);
};

/** The Admin / Vendor page is for admins only — everyone else goes home. */
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;

  return auth.isAdmin() ? true : router.createUrlTree(['/home']);
};

/** The delivery screen is for riders only — everyone else goes to their own home. */
export const riderGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;

  return auth.isRider() ? true : router.createUrlTree([auth.homePath()]);
};

/** The "new password" screen only opens right after a correct reset code. */
export const resetGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;

  return auth.resetPending() ? true : router.createUrlTree(['/forgot-password']);
};

/** Pages every role may open (settings): any session at all, no role redirects. */
export const sessionGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;

  return auth.hasSession() ? true : router.createUrlTree(['/welcome']);
};
