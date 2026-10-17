import { Component, inject, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
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

/**
 * Forgot password, step 3 of 3: choose a new password. Only reachable after a correct code
 * (see resetGuard). Leaving without saving discards the temporary session.
 */
@Component({
  selector: 'app-new-password',
  templateUrl: './new-password.page.html',
  styleUrls: ['./new-password.page.scss'],
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
  ],
})
export class NewPasswordPage implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  readonly password = signal('');
  readonly confirm = signal('');
  readonly formError = signal('');
  readonly busy = signal(false);

  async save(): Promise<void> {
    if (this.busy()) return;
    this.formError.set('');

    if (this.password().length < 8) {
      await this.showError('Password must be at least 8 characters.');
      return;
    }
    if (this.password() !== this.confirm()) {
      await this.showError('The two passwords do not match.');
      return;
    }

    this.busy.set(true);
    let result: AuthResult;
    try {
      result = await this.auth.saveNewPassword(this.password());
    } catch {
      result = { ok: false, message: 'Something went wrong. Please try again.' };
    } finally {
      this.busy.set(false);
    }

    if (!result.ok) {
      await this.showError(result.message);
      return;
    }

    await this.toast(result.message);
    await this.router.navigateByUrl(this.auth.homePath(), { replaceUrl: true });
  }

  /** Closing this screen without saving ends the reset (a no-op once the password is saved). */
  ngOnDestroy(): void {
    void this.auth.cancelPasswordReset();
  }

  private async showError(message: string): Promise<void> {
    this.formError.set(message);
    await this.toast(message, 'danger');
  }

  private async toast(message: string, color: 'primary' | 'danger' = 'primary'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 2200, position: 'top', color });
    await toast.present();
  }
}
