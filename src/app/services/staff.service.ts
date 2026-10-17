import { inject, Injectable, signal } from '@angular/core';

import { UserRole } from '../models/user.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export type StaffRole = Exclude<UserRole, 'guest'>;

export interface Account {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
}

/** Admin tool: see every account and choose who is a customer, rider or admin. */
@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly backend = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  readonly accounts = signal<Account[]>([]);
  readonly loading = signal(false);

  /** Roles can only be changed with the real backend (the server checks you are an admin). */
  get available(): boolean {
    return this.backend.enabled;
  }

  async refresh(): Promise<void> {
    if (!this.backend.enabled || !this.auth.isAdmin()) return;

    this.loading.set(true);
    const { data, error } = await this.backend.client
      .from('profiles')
      .select('id, name, email, role')
      .order('created_at', { ascending: false });
    this.loading.set(false);
    if (error || !data) return;

    this.accounts.set(
      data.map((p) => ({
        id: p.id as string,
        name: (p.name as string) || (p.email as string) || 'Unnamed',
        email: (p.email as string) ?? '',
        role: p.role as StaffRole,
      })),
    );
  }

  /** The server decides: it refuses non-admins and changing your own role. */
  async setRole(id: string, role: StaffRole): Promise<{ ok: boolean; message: string }> {
    if (!this.backend.enabled) return { ok: false, message: 'Roles need the online backend.' };
    if (id === this.auth.user()?.id) return { ok: false, message: 'You cannot change your own role.' };

    const { error } = await this.backend.client.rpc('set_user_role', { p_user: id, p_role: role });
    if (error) return { ok: false, message: error.message };

    this.accounts.update((list) => list.map((a) => (a.id === id ? { ...a, role } : a)));
    return { ok: true, message: 'Role updated.' };
  }
}
