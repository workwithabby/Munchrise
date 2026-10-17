import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ToastController } from '@ionic/angular';

import { AppNotification, NotificationType } from '../models/notification.model';
import { AuthService } from './auth.service';
import { load, makeId, save } from './storage';
import { SupabaseService } from './supabase.service';

const STORAGE_KEY = 'munchrise.notifications';

function fromRow(row: Record<string, unknown>): AppNotification {
  return {
    id: row['id'] as string,
    title: row['title'] as string,
    message: row['message'] as string,
    type: row['type'] as NotificationType,
    read: row['read'] as boolean,
    createdAt: row['created_at'] as string,
  };
}

/**
 * Order updates, promo alerts and reward alerts.
 * Backend mode: the `notifications` table, with new ones arriving live
 * (an order moving to "Out for Delivery" shows up on the customer's phone at once).
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly auth = inject(AuthService);
  private readonly backend = inject(SupabaseService);
  private readonly toastController = inject(ToastController);

  private readonly itemsState = signal<AppNotification[]>(
    this.backend.enabled ? [] : load<AppNotification[]>(STORAGE_KEY, []),
  );
  private channel: RealtimeChannel | undefined;

  readonly items = this.itemsState.asReadonly();
  readonly unreadCount = computed(() => this.itemsState().filter((n) => !n.read).length);

  constructor() {
    effect(() => {
      const user = this.auth.user();
      untracked(() => {
        if (!this.backend.enabled) return;
        this.stopListening();
        if (user && user.role !== 'guest') {
          void this.load(user.id);
          this.listen(user.id);
        } else {
          this.itemsState.set([]);
        }
      });
    });
  }

  add(title: string, message: string, type: NotificationType = 'order'): AppNotification {
    const notification: AppNotification = {
      id: makeId('notif'),
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    };

    this.itemsState.set([notification, ...this.itemsState()].slice(0, 50));

    const user = this.auth.user();
    if (this.backend.enabled) {
      if (user && user.role === 'user') {
        void Promise.resolve(
          this.backend.client.from('notifications').insert({ user_id: user.id, title, message, type }).select().single(),
        ).then(({ data }) => {
          // swap the temporary item for the saved one (its live copy is ignored below)
          if (data) {
            this.itemsState.update((list) => list.map((n) => (n.id === notification.id ? fromRow(data) : n)));
          }
        });
      }
    } else {
      save(STORAGE_KEY, this.itemsState());
    }
    return notification;
  }

  markRead(id: string): void {
    this.updateAll((n) => (n.id === id ? { ...n, read: true } : n));
    this.write((table) => table.update({ read: true }).eq('id', id));
  }

  markAllRead(): void {
    this.updateAll((n) => ({ ...n, read: true }));
    const user = this.auth.user();
    if (user) this.write((table) => table.update({ read: true }).eq('user_id', user.id).eq('read', false));
  }

  remove(id: string): void {
    this.itemsState.set(this.itemsState().filter((n) => n.id !== id));
    this.persistLocal();
    this.write((table) => table.delete().eq('id', id));
  }

  clear(): void {
    this.itemsState.set([]);
    this.persistLocal();
    const user = this.auth.user();
    if (user) this.write((table) => table.delete().eq('user_id', user.id));
  }

  private updateAll(change: (n: AppNotification) => AppNotification): void {
    this.itemsState.set(this.itemsState().map(change));
    this.persistLocal();
  }

  private persistLocal(): void {
    if (!this.backend.enabled) save(STORAGE_KEY, this.itemsState());
  }

  /** Runs a change against the `notifications` table (backend mode only). */
  private write(run: (table: ReturnType<SupabaseService['client']['from']>) => PromiseLike<unknown>): void {
    if (!this.backend.enabled || !this.auth.isLoggedIn()) return;
    void Promise.resolve(run(this.backend.client.from('notifications')));
  }

  private async load(userId: string): Promise<void> {
    const { data, error } = await this.backend.client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || !data) return;
    this.itemsState.set(data.map(fromRow));
  }

  /** New notifications arrive live. */
  private listen(userId: string): void {
    this.channel = this.backend.client
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const incoming = fromRow(payload.new);
          this.itemsState.update((list) => {
            // one we added ourselves is already on screen
            const dup = list.some(
              (n) => n.id === incoming.id || (n.title === incoming.title && n.message === incoming.message && !n.read),
            );
            if (!dup) void this.banner(incoming);
            return dup ? list : [incoming, ...list].slice(0, 50);
          });
        },
      )
      .subscribe();
  }

  /** A short banner for an alert that arrives while the app is open (new order, ready for pickup…). */
  private async banner(n: AppNotification): Promise<void> {
    const toast = await this.toastController.create({
      header: n.title,
      message: n.message,
      duration: 3500,
      position: 'top',
      color: 'primary',
    });
    await toast.present();
  }

  private stopListening(): void {
    if (this.channel) {
      void this.backend.client.removeChannel(this.channel);
      this.channel = undefined;
    }
  }
}
