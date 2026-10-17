import { computed, Component, inject, signal } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { AuthService } from '../../services/auth.service';
import { Account, StaffRole, StaffService } from '../../services/staff.service';

/** Admin: give people the customer, rider or admin role without touching the database. */
@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.page.html',
  styleUrls: ['./admin-users.page.scss'],
  standalone: true,
  imports: [EmptyStateComponent, IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar],
})
export class AdminUsersPage {
  private readonly staff = inject(StaffService);
  private readonly auth = inject(AuthService);
  private readonly toastController = inject(ToastController);

  readonly roles: { value: StaffRole; label: string }[] = [
    { value: 'user', label: 'Customer' },
    { value: 'rider', label: 'Rider' },
    { value: 'admin', label: 'Admin' },
  ];

  readonly available = this.staff.available;
  readonly loading = this.staff.loading;
  readonly filter = signal<'all' | StaffRole>('all');
  readonly search = signal('');
  /** Which account is being saved right now (disables its buttons). */
  readonly savingId = signal<string | null>(null);

  readonly accounts = computed(() => {
    const role = this.filter();
    const term = this.search().trim().toLowerCase();
    return this.staff
      .accounts()
      .filter((a) => role === 'all' || a.role === role)
      .filter((a) => !term || a.name.toLowerCase().includes(term) || a.email.toLowerCase().includes(term));
  });

  constructor() {
    void this.staff.refresh();
  }

  count(role: 'all' | StaffRole): number {
    return role === 'all' ? this.staff.accounts().length : this.staff.accounts().filter((a) => a.role === role).length;
  }

  isMe(account: Account): boolean {
    return account.id === this.auth.user()?.id;
  }

  async choose(account: Account, role: StaffRole): Promise<void> {
    if (role === account.role || this.isMe(account)) return;

    this.savingId.set(account.id);
    const result = await this.staff.setRole(account.id, role);
    this.savingId.set(null);
    await this.toast(result.ok ? `${account.name} is now ${this.labelOf(role)}.` : result.message);
  }

  labelOf(role: StaffRole): string {
    return this.roles.find((r) => r.value === role)?.label ?? role;
  }

  private async toast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 2200, position: 'top', color: 'primary' });
    await toast.present();
  }
}
