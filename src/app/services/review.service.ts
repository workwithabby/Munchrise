import { computed, inject, Injectable, signal } from '@angular/core';

import { Review } from '../models/review.model';
import { AuthService } from './auth.service';
import { load, makeId, save } from './storage';
import { SupabaseService } from './supabase.service';

const STORAGE_KEY = 'munchrise.reviews';

/** Ratings & reviews per product (the `reviews` table when the backend is on). */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly backend = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  /** Backend: every review from the server. Local: only the ones this device added. */
  private readonly reviewsState = signal<Review[]>(this.backend.enabled ? [] : load<Review[]>(STORAGE_KEY, []));

  /** All reviews, newest sources first. */
  readonly all = computed<Review[]>(() => this.reviewsState());

  constructor() {
    if (this.backend.enabled) void this.refresh();
  }

  /** Reviews for one product, newest first. */
  forProduct(productId: number): Review[] {
    return this.all()
      .filter((r) => r.productId === productId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  countFor(productId: number): number {
    return this.forProduct(productId).length;
  }

  /** Average of the written reviews (the catalog rating stays as-is). */
  averageFor(productId: number): number {
    const reviews = this.forProduct(productId);
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }

  /** Can the signed-in person edit or delete this review? Only their own. */
  isMine(review: Review): boolean {
    if (this.backend.enabled) {
      const user = this.auth.user();
      return !!user && user.role !== 'guest' && review.userId === user.id;
    }
    // Local mode: the reviews saved on this device are yours.
    return this.reviewsState().some((r) => r.id === review.id);
  }

  add(productId: number, rating: number, comment: string, author = 'You'): Review {
    const review: Review = {
      id: makeId('review'),
      productId,
      userId: this.auth.user()?.id,
      author,
      rating: Math.min(5, Math.max(1, Math.round(rating))),
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    const next = [review, ...this.reviewsState()];
    this.reviewsState.set(next);

    if (this.backend.enabled) {
      const user = this.auth.user();
      if (user && user.role !== 'guest') {
        void Promise.resolve(
          this.backend.client
            .from('reviews')
            .insert({ product_id: productId, user_id: user.id, author, rating: review.rating, comment: review.comment }),
        ).then(() => this.refresh()); // swaps the temporary review for the saved one (or drops it if refused)
      }
    } else {
      save(STORAGE_KEY, next);
    }
    return review;
  }

  /** Changes the stars and comment of one of your own reviews. */
  update(id: string, rating: number, comment: string): boolean {
    const current = this.reviewsState().find((r) => r.id === id);
    if (!current || !this.isMine(current)) return false;

    const changes = { rating: Math.min(5, Math.max(1, Math.round(rating))), comment: comment.trim() };
    const next = this.reviewsState().map((r) => (r.id === id ? { ...r, ...changes } : r));
    this.reviewsState.set(next);

    if (this.backend.enabled) {
      void Promise.resolve(this.backend.client.from('reviews').update(changes).eq('id', id)).then(() =>
        this.refresh(), // shows what the server really kept
      );
    } else {
      save(STORAGE_KEY, next);
    }
    return true;
  }

  /** Deletes one of your own reviews. */
  remove(id: string): boolean {
    const current = this.reviewsState().find((r) => r.id === id);
    if (!current || !this.isMine(current)) return false;

    const next = this.reviewsState().filter((r) => r.id !== id);
    this.reviewsState.set(next);

    if (this.backend.enabled) {
      void Promise.resolve(this.backend.client.from('reviews').delete().eq('id', id)).then(() => this.refresh());
    } else {
      save(STORAGE_KEY, next);
    }
    return true;
  }

  async refresh(): Promise<void> {
    const { data, error } = await this.backend.client
      .from('reviews')
      .select('id, product_id, user_id, author, rating, comment, created_at')
      .order('created_at', { ascending: false });
    if (error || !data) return;

    this.reviewsState.set(
      data.map((r) => ({
        id: r.id as string,
        productId: r.product_id as number,
        userId: (r.user_id as string | null) ?? undefined,
        author: r.author as string,
        rating: r.rating as number,
        comment: r.comment as string,
        createdAt: r.created_at as string,
      })),
    );
  }
}
