import { Component, computed, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { AuthResult, AuthService } from '../../services/auth.service';

/** Seconds before "Resend code" can be used again. */
const RESEND_SECONDS = 60;

/**
 * Type the 6-digit code from the email. Two uses, picked by the route's `data.mode`:
 * sign up (confirm the account) and reset ("Forgot password": then the new-password screen opens).
 */
@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.page.html',
  styleUrls: ['./verify-email.page.scss'],
  standalone: true,
  imports: [
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonSpinner,
    IonTitle,
    IonToolbar,
    RouterLink,
  ],
})
export class VerifyEmailPage implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  private readonly route = inject(ActivatedRoute);

  /** True on /reset-code (Forgot password), false on /verify-email (sign up). */
  readonly isReset = this.route.snapshot.data['mode'] === 'reset';
  readonly email = signal(this.route.snapshot.queryParamMap.get('email') ?? '');
  readonly code = signal('');
  readonly formError = signal('');
  readonly busy = signal(false);
  readonly resending = signal(false);
  readonly cooldown = signal(RESEND_SECONDS);
  readonly focused = signal(false);

  /** One entry per box: the typed digit or an empty string. */
  readonly boxes = computed(() => Array.from({ length: 6 }, (_, i) => this.code()[i] ?? ''));
  /** The box waiting for the next digit (-1 once all six are filled). */
  readonly activeBox = computed(() => (this.code().length < 6 ? this.code().length : -1));
  /** a***@gmail.com — shown instead of the full address. */
  readonly maskedEmail = computed(() => {
    const [name, domain] = this.email().split('@');
    if (!domain) return this.email();
    return `${name.slice(0, 2)}${'•'.repeat(Math.max(1, name.length - 2))}@${domain}`;
  });
  readonly cooldownText = computed(() => {
    const s = this.cooldown();
    return `0:${String(s).padStart(2, '0')}`;
  });

  private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');

  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.startCooldown();
  }

  ionViewDidEnter(): void {
    this.focusInput();
  }

  focusInput(): void {
    this.codeInput()?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  /** Keeps only digits (people paste "123 456") and submits as soon as 6 are in. */
  onCodeInput(value: string | null | undefined): void {
    const digits = (value ?? '').replace(/\D/g, '').slice(0, 6);
    this.code.set(digits);
    const input = this.codeInput()?.nativeElement;
    if (input && input.value !== digits) input.value = digits; // drop letters the person typed
    this.formError.set('');
    if (digits.length === 6) void this.verify();
  }

  async verify(): Promise<void> {
    if (this.busy()) return;
    this.formError.set('');

    if (!this.email()) {
      this.formError.set(this.isReset ? 'Missing email. Go back and enter it again.' : 'Missing email. Go back and sign up again.');
      return;
    }
    if (this.code().length !== 6) {
      this.formError.set('Enter the 6-digit code from your email.');
      return;
    }

    this.busy.set(true);
    const result = this.isReset
      ? await this.auth.verifyResetCode(this.email(), this.code())
      : await this.auth.verifyOtp(this.email(), this.code());
    this.busy.set(false);

    if (!result.ok) {
      this.formError.set(result.message);
      this.code.set('');
      await this.toast(result.message, 'danger');
      return;
    }

    await this.toast(result.message);
    await this.router.navigateByUrl(this.isReset ? '/new-password' : this.auth.homePath(), { replaceUrl: true });
  }

  async resend(): Promise<void> {
    if (this.cooldown() > 0 || this.resending() || !this.email()) return;

    this.resending.set(true);
    let result: AuthResult;
    try {
      result = this.isReset ? await this.auth.requestPasswordReset(this.email()) : await this.auth.resendCode(this.email());
    } catch {
      result = { ok: false, message: 'Something went wrong. Please try again.' };
    } finally {
      this.resending.set(false);
    }
    await this.toast(result.message, result.ok ? 'primary' : 'danger');
    if (result.ok) this.startCooldown();
  }

  private startCooldown(): void {
    clearInterval(this.timer);
    this.cooldown.set(RESEND_SECONDS);
    this.timer = setInterval(() => {
      this.cooldown.update((s) => Math.max(0, s - 1));
      if (this.cooldown() === 0) clearInterval(this.timer);
    }, 1000);
  }

  private async toast(message: string, color: 'primary' | 'danger' = 'primary'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1800, position: 'top', color });
    await toast.present();
  }
}
