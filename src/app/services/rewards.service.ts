import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';

import { RewardTier, RewardTransaction } from '../models/reward.model';
import { AuthService } from './auth.service';
import { load, makeId, save } from './storage';
import { SupabaseService } from './supabase.service';

const POINTS_KEY = 'munchrise.points';
const HISTORY_KEY = 'munchrise.points-history';
const VOUCHER_KEY = 'munchrise.vouchers';

export interface Voucher {
  id: string;
  discount: number;
  /** ISO date string */
  createdAt: string;
}

export interface RedeemResult {
  ok: boolean;
  message: string;
  discount?: number;
}

/**
 * Points: 1 point for every ₱10 spent (Section 7).
 * Backend mode: the points ledger and vouchers live in Supabase; the server adds points
 * when an order is placed and spends vouchers (see place_order), and `redeem` is a server
 * function. Local mode (unit tests): localStorage.
 */
@Injectable({ providedIn: 'root' })
export class RewardsService {
  private readonly auth = inject(AuthService);
  private readonly backend = inject(SupabaseService);

  private readonly pointsState = signal<number>(this.backend.enabled ? 0 : load<number>(POINTS_KEY, 0));
  private readonly historyState = signal<RewardTransaction[]>(
    this.backend.enabled ? [] : load<RewardTransaction[]>(HISTORY_KEY, []),
  );
  private readonly vouchersState = signal<Voucher[]>(this.backend.enabled ? [] : load<Voucher[]>(VOUCHER_KEY, []));

  constructor() {
    effect(() => {
      const user = this.auth.user();
      untracked(() => {
        if (!this.backend.enabled) return;
        if (user && user.role === 'user') void this.refresh();
        else {
          this.pointsState.set(0);
          this.historyState.set([]);
          this.vouchersState.set([]);
        }
      });
    });
  }

  /** Re-reads points, history and unused vouchers from the server. */
  async refresh(): Promise<void> {
    const user = this.auth.user();
    if (!this.backend.enabled || !user || user.role !== 'user') return;
    const sb = this.backend.client;

    const [ledger, vouchers] = await Promise.all([
      sb.from('reward_ledger').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      sb.from('vouchers').select('*').eq('user_id', user.id).is('used_at', null).order('created_at', { ascending: false }),
    ]);

    if (ledger.data) {
      this.pointsState.set(ledger.data.reduce((sum, r) => sum + (r.points as number), 0));
      this.historyState.set(
        ledger.data.slice(0, 50).map((r) => ({
          id: r.id as string,
          type: r.kind as 'earn' | 'redeem',
          points: Math.abs(r.points as number),
          label: r.label as string,
          createdAt: r.created_at as string,
        })),
      );
    }
    if (vouchers.data) {
      this.vouchersState.set(
        vouchers.data.map((v) => ({ id: v.id as string, discount: Number(v.discount), createdAt: v.created_at as string })),
      );
    }
  }

  readonly points = this.pointsState.asReadonly();
  readonly history = this.historyState.asReadonly();
  readonly vouchers = this.vouchersState.asReadonly();

  /** Total peso value of the vouchers you can spend at checkout. */
  readonly voucherTotal = computed(() =>
    this.vouchersState().reduce((total, voucher) => total + voucher.discount, 0),
  );

  /** Discounts you can buy with points. */
  readonly tiers: RewardTier[] = [
    { points: 100, discount: 50 },
    { points: 180, discount: 100 },
    { points: 250, discount: 150 },
  ];

  readonly nextTier = computed<RewardTier | undefined>(() => {
    const sorted = [...this.tiers].sort((a, b) => a.points - b.points);
    return sorted.find((tier) => tier.points > this.pointsState()) ?? sorted[sorted.length - 1];
  });

  /** Progress (0-100) toward the next reward tier. */
  readonly progress = computed(() => {
    const next = this.nextTier();
    if (!next) return 100;
    return Math.min(100, Math.round((this.pointsState() / next.points) * 100));
  });

  /** Points earned for an amount spent: ₱10 = 1 point. */
  pointsFor(amount: number): number {
    return Math.max(0, Math.floor(amount / 10));
  }

  addEarn(points: number, label: string): void {
    if (points <= 0 || this.backend.enabled) return; // the server adds points when an order is placed

    this.pointsState.update((value) => value + points);
    this.pushHistory({ type: 'earn', points, label });
  }

  /** Swap points for a voucher you can use at checkout. */
  async redeem(tier: RewardTier): Promise<RedeemResult> {
    if (this.backend.enabled) {
      const { error } = await this.backend.client.rpc('redeem_reward', { p_points: tier.points });
      if (error) return { ok: false, message: error.message };
      await this.refresh();
      return { ok: true, message: `₱${tier.discount} voucher redeemed!`, discount: tier.discount };
    }

    if (this.pointsState() < tier.points) {
      return { ok: false, message: `You need ${tier.points} points for this reward.` };
    }

    this.pointsState.update((value) => value - tier.points);

    const voucher: Voucher = {
      id: makeId('voucher'),
      discount: tier.discount,
      createdAt: new Date().toISOString(),
    };
    this.vouchersState.update((list) => [voucher, ...list]);

    this.pushHistory({ type: 'redeem', points: tier.points, label: `Redeemed ₱${tier.discount} voucher` });

    return { ok: true, message: `₱${tier.discount} voucher redeemed!`, discount: tier.discount };
  }

  /** Used by OrderService when a voucher is spent during checkout. */
  spendVoucher(amount: number): void {
    if (amount <= 0 || this.backend.enabled) return; // the server uses the vouchers up in place_order

    let remaining = amount;
    const keep: Voucher[] = [];

    // Simple demo rule: whole vouchers are consumed, oldest first.
    for (const voucher of this.vouchersState()) {
      if (remaining <= 0) {
        keep.push(voucher);
      } else {
        remaining -= voucher.discount;
      }
    }

    this.vouchersState.set(keep);
    save(VOUCHER_KEY, keep);
  }

  private pushHistory(entry: Omit<RewardTransaction, 'id' | 'createdAt'>): void {
    const transaction: RewardTransaction = {
      ...entry,
      id: makeId('tx'),
      createdAt: new Date().toISOString(),
    };
    const next = [transaction, ...this.historyState()].slice(0, 50);
    this.historyState.set(next);
    save(HISTORY_KEY, next);
  }
}
