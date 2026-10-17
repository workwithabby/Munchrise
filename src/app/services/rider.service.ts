import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';

import { Order } from '../models/order.model';
import { AuthService } from './auth.service';
import { OrderService } from './order.service';
import { load, save } from './storage';
import { SupabaseService } from './supabase.service';

const KEY = 'munchrise.rider';

export type Vehicle = 'Motorcycle' | 'Bicycle' | 'E-bike';

interface RiderSettings {
  online: boolean;
  vehicle: Vehicle;
  plate: string;
}

export interface RiderStats {
  deliveries: number;
  earnings: number;
}

/** When an order was delivered (falls back to its placed time). */
export function deliveredAt(order: Order): Date {
  const hit = order.history?.find((h) => h.status === 'Delivered');
  return new Date(hit?.at ?? order.placedAt);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Rider-only state: availability, vehicle and what the rider earned.
 * Earnings are the delivery fee of every order the rider delivered.
 */
@Injectable({ providedIn: 'root' })
export class RiderService {
  private readonly auth = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly backend = inject(SupabaseService);

  private readonly settings = signal<RiderSettings>(
    this.backend.enabled
      ? { online: true, vehicle: 'Motorcycle', plate: '' }
      : load<RiderSettings>(KEY, { online: true, vehicle: 'Motorcycle', plate: '' }),
  );

  constructor() {
    // A rider's availability and vehicle are saved in the `rider_settings` table.
    effect(() => {
      const user = this.auth.user();
      untracked(() => {
        if (this.backend.enabled && user?.role === 'rider') void this.loadSettings(user.id);
      });
    });
  }

  readonly online = computed(() => this.settings().online);
  readonly vehicle = computed(() => this.settings().vehicle);
  readonly plate = computed(() => this.settings().plate);

  /** Orders this rider picked up (on the way) or finished, newest first. */
  readonly mine = computed(() => {
    const user = this.auth.user();
    const name = this.auth.displayName();
    return this.orderService.orders().filter((o) => (o.riderId ? o.riderId === user?.id : o.riderName === name));
  });

  readonly onTheWay = computed(() => this.mine().filter((o) => o.status === 'Out for Delivery'));
  readonly completed = computed(() => this.mine().filter((o) => o.status === 'Delivered'));

  /** Cash taken from customers (Cash on Delivery) that the rider still has to hand in. */
  readonly cashOnHand = computed(() =>
    this.completed()
      .filter((o) => o.payment === 'Cash on Delivery')
      .reduce((sum, o) => sum + o.total, 0),
  );

  readonly today = computed(() => this.statsSince(startOfDay(new Date())));
  readonly week = computed(() => this.statsSince(startOfDay(new Date(Date.now() - 6 * 86_400_000))));
  readonly allTime = computed(() => this.statsSince(new Date(0)));

  setOnline(online: boolean): void {
    this.update({ online });
  }

  setVehicle(vehicle: Vehicle, plate: string): void {
    this.update({ vehicle, plate: plate.trim().toUpperCase() });
  }

  private update(patch: Partial<RiderSettings>): void {
    const next = { ...this.settings(), ...patch };
    this.settings.set(next);

    const user = this.auth.user();
    if (this.backend.enabled) {
      if (user?.role === 'rider') {
        void Promise.resolve(
          this.backend.client.from('rider_settings').upsert({ user_id: user.id, online: next.online, vehicle: next.vehicle, plate: next.plate }),
        );
      }
    } else {
      save(KEY, next);
    }
  }

  private async loadSettings(userId: string): Promise<void> {
    const { data } = await this.backend.client.from('rider_settings').select('*').eq('user_id', userId).maybeSingle();
    if (data) {
      this.settings.set({ online: data.online as boolean, vehicle: data.vehicle as Vehicle, plate: (data.plate as string) ?? '' });
    }
  }

  private statsSince(from: Date): RiderStats {
    const orders = this.completed().filter((o) => deliveredAt(o) >= from);
    return { deliveries: orders.length, earnings: orders.reduce((sum, o) => sum + o.deliveryFee, 0) };
  }
}
