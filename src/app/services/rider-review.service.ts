import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';

import { AuthService } from './auth.service';
import { load, makeId, save } from './storage';
import { SupabaseService } from './supabase.service';

const STORAGE_KEY = 'munchrise.riderReviews';

/** A customer's rating of the rider who delivered one order. */
export interface RiderReview {
  id: string;
  orderId: string;
  riderId?: string;
  author: string;
  /** 1 - 5 stars */
  rating: number;
  comment: string;
  /** ISO date string */
  createdAt: string;
}

/**
 * Rider ratings (the `rider_reviews` table when the backend is on).
 * A customer sees their own, a rider sees the ones about them, an admin sees all.
 */
@Injectable({ providedIn: 'root' })
export class RiderReviewService {
  private readonly backend = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  private readonly state = signal<RiderReview[]>(
    this.backend.enabled ? [] : load<RiderReview[]>(STORAGE_KEY, []),
  );

  readonly all = this.state.asReadonly();

  /** Reviews written about the signed-in rider, newest first. */
  readonly mine = computed(() => {
    const id = this.auth.user()?.id;
    return this.state()
      .filter((r) => !this.backend.enabled || r.riderId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  readonly average = computed(() => {
    const list = this.mine();
    return list.length === 0 ? 0 : list.reduce((sum, r) => sum + r.rating, 0) / list.length;
  });

  constructor() {
    if (!this.backend.enabled) return;
    effect(() => {
      const user = this.auth.user();
      untracked(() => {
        if (user && user.role !== 'guest') void this.refresh();
        else this.state.set([]);
      });
    });
  }

  forOrder(orderId: string): RiderReview | undefined {
    return this.state().find((r) => r.orderId === orderId);
  }

  async add(orderId: string, riderId: string | undefined, rating: number, comment: string, author: string): Promise<boolean> {
    if (this.forOrder(orderId)) return false;

    const review: RiderReview = {
      id: makeId('riderReview'),
      orderId,
      riderId,
      author,
      rating: Math.min(5, Math.max(1, Math.round(rating))),
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    if (this.backend.enabled) {
      const user = this.auth.user();
      if (!user || user.role === 'guest' || !riderId) return false;
      const { error } = await this.backend.client.from('rider_reviews').insert({
        order_id: orderId,
        rider_id: riderId,
        user_id: user.id,
        author,
        rating: review.rating,
        comment: review.comment,
      });
      if (error) return false;
      await this.refresh();
      return true;
    }

    const next = [review, ...this.state()];
    this.state.set(next);
    save(STORAGE_KEY, next);
    return true;
  }

  async refresh(): Promise<void> {
    const { data, error } = await this.backend.client
      .from('rider_reviews')
      .select('id, order_id, rider_id, author, rating, comment, created_at')
      .order('created_at', { ascending: false });
    if (error || !data) return;

    this.state.set(
      data.map((r) => ({
        id: r.id as string,
        orderId: r.order_id as string,
        riderId: r.rider_id as string,
        author: r.author as string,
        rating: r.rating as number,
        comment: r.comment as string,
        createdAt: r.created_at as string,
      })),
    );
  }
}
