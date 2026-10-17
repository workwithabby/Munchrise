import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { AuthResult, AuthService } from '../../services/auth.service';

/** Loose but useful email check: something@something.tld */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Create an account; the email is confirmed with a 6-digit code on the next screen. */
@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: true,
  imports: [
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonInputPasswordToggle,
    IonSpinner,
    IonTitle,
    IonToolbar,
    RouterLink,
  ],
})
export class SignupPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  readonly firstName = signal('');
  readonly lastName = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly formError = signal('');
  /** True while the server call runs: shows a spinner and blocks double taps. */
  readonly busy = signal(false);

  async signUp(): Promise<void> {
    if (this.busy()) return;
    this.formError.set('');

    const email = this.email().trim();
    if (!EMAIL_PATTERN.test(email)) {
      await this.showError('Please enter a valid email.');
      return;
    }

    if (this.password().length < 8) {
      await this.showError('Password must be at least 8 characters.');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      await this.showError('Passwords do not match.');
      return;
    }

    this.busy.set(true);
    let result: AuthResult;
    try {
      result = await this.auth.signUp(this.firstName(), this.lastName(), email, this.password());
    } catch {
      result = { ok: false, message: 'Something went wrong. Please try again.' };
    } finally {
      this.busy.set(false);
    }
    if (result.needsVerification) {
      await this.router.navigate(['/verify-email'], { queryParams: { email } });
      return;
    }
    if (!result.ok) {
      await this.showError(result.message);
      return;
    }

    await this.toast(result.message);
    await this.router.navigateByUrl('/home', { replaceUrl: true });
  }

  async continueAsGuest(): Promise<void> {
    this.auth.continueAsGuest();
    await this.toast('Browsing as guest. Enjoy your breakfast!');
    await this.router.navigateByUrl('/home', { replaceUrl: true });
  }

  private async showError(message: string): Promise<void> {
    this.formError.set(message);
    await this.toast(message, 'danger');
  }

  private async toast(message: string, color: 'primary' | 'danger' = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'top',
      color,
    });
    await toast.present();
  }
}
