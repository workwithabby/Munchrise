import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';

import { Product } from '../models/product.model';
import { AuthService } from './auth.service';
import { ProductService } from './product.service';
import { load, save } from './storage';
import { SupabaseService } from './supabase.service';

const STORAGE_KEY = 'munchrise.favorites';

/** Wishlist of product ids (saved in the `favorites` table when the backend is on). */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly productService = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly backend = inject(SupabaseService);

  private readonly idsState = signal<number[]>(
    this.backend.enabled ? [] : load<number[]>(STORAGE_KEY, []),
  );

  readonly ids = this.idsState.asReadonly();

  /** Wishlist ready to render. */
  readonly products = computed<Product[]>(() =>
    this.idsState()
      .map((id) => this.productService.getById(id))
      .filter((p): p is Product => p !== undefined),
  );

  readonly count = computed(() => this.idsState().length);

  constructor() {
    effect(() => {
      const user = this.auth.user();
      untracked(() => {
        if (!this.backend.enabled) return;
        if (user && user.role === 'user') void this.loadFor(user.id);
        else this.idsState.set([]);
      });
    });
  }

  has(productId: number): boolean {
    return this.idsState().includes(productId);
  }

  /** Returns true when the product is now a favorite. */
  toggle(productId: number): boolean {
    const isFavorite = this.has(productId);
    const next = isFavorite
      ? this.idsState().filter((id) => id !== productId)
      : [...this.idsState(), productId];

    this.idsState.set(next);

    if (this.backend.enabled) {
      const user = this.auth.user();
      if (user && user.role === 'user') {
        const table = this.backend.client.from('favorites');
        const request = isFavorite
          ? table.delete().eq('user_id', user.id).eq('product_id', productId)
          : table.upsert({ user_id: user.id, product_id: productId });
        void Promise.resolve(request).then(({ error }) => {
          if (error) void this.loadFor(user.id);
        });
      }
    } else {
      save(STORAGE_KEY, next);
    }
    return !isFavorite;
  }

  add(productId: number): void {
    if (!this.has(productId)) {
      this.toggle(productId);
    }
  }

  remove(productId: number): void {
    if (this.has(productId)) {
      this.toggle(productId);
    }
  }

  private async loadFor(userId: string): Promise<void> {
    const { data, error } = await this.backend.client.from('favorites').select('product_id').eq('user_id', userId);
    if (error || !data) return;
    this.idsState.set(data.map((r) => r.product_id as number));
  }
}
