import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';

import { CartItem, DetailedCartItem } from '../models/cart.model';
import { Product } from '../models/product.model';
import { AuthService } from './auth.service';
import { ProductService } from './product.service';
import { load, save } from './storage';
import { SupabaseService } from './supabase.service';

const STORAGE_KEY = 'munchrise.cart';

/**
 * The shopping cart.
 *
 * - Backend mode: the cart lives in the `cart_items` table, so it follows the
 *   customer to any phone, and checkout (a server function) reads the same rows.
 *   Screens update instantly; the saving happens right behind, in order.
 * - Local mode (unit tests): localStorage.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly productService = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly backend = inject(SupabaseService);

  /** Raw cart lines. Read-only from outside — use the methods below. */
  private readonly itemsState = signal<CartItem[]>(
    this.backend.enabled ? [] : load<CartItem[]>(STORAGE_KEY, []),
  );

  /** Saves wait in line so they reach the server in the order they were made. */
  private pending: Promise<unknown> = Promise.resolve();

  /** Number of items in the cart (used for the menu badge). */
  readonly count = computed(() =>
    this.itemsState().reduce((total, item) => total + item.quantity, 0),
  );

  /** Sum of price x quantity (delivery fee is added at checkout). */
  readonly subtotal = computed(() =>
    this.itemsState().reduce((total, item) => {
      const product = this.productService.getById(item.productId);
      return total + (product ? product.price * item.quantity : 0);
    }, 0),
  );

  /** Cart lines joined with their product — what the cart page renders. */
  readonly detailedItems = computed<DetailedCartItem[]>(() => {
    const lines: DetailedCartItem[] = [];

    for (const item of this.itemsState()) {
      const product = this.productService.getById(item.productId);
      if (product) {
        lines.push({ product, quantity: item.quantity });
      }
    }

    return lines;
  });

  constructor() {
    // Load the saved cart when a customer signs in; empty it when they sign out.
    effect(() => {
      const user = this.auth.user();
      untracked(() => {
        if (!this.backend.enabled) return;
        if (user && user.role === 'user') void this.load(user.id);
        else this.itemsState.set([]);
      });
    });
  }

  /** Resolves when every change made so far has been saved (checkout waits for this). */
  flush(): Promise<unknown> {
    return this.pending;
  }

  /** Re-reads the cart from the server (after checkout the server has emptied it). */
  async reload(): Promise<void> {
    const user = this.auth.user();
    if (this.backend.enabled && user && user.role === 'user') await this.load(user.id);
  }

  /** Add a product (or increase its quantity). Respects the available stock.
   *  Guests can only look around — their cart stays empty. */
  add(product: Product, quantity = 1): boolean {
    if (this.auth.isGuest()) {
      return false;
    }

    const existing = this.itemsState().find((i) => i.productId === product.id);
    const currentQty = existing?.quantity ?? 0;
    const nextQty = Math.min(currentQty + quantity, product.stock);

    if (nextQty === currentQty) {
      return false; // already at max stock
    }

    if (existing) {
      this.update((items) =>
        items.map((i) => (i.productId === product.id ? { ...i, quantity: nextQty } : i)),
      );
    } else {
      this.update((items) => [...items, { productId: product.id, quantity: nextQty }]);
    }

    return true;
  }

  /** Set an exact quantity (0 removes the line). */
  setQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.remove(productId);
      return;
    }

    const product = this.productService.getById(productId);
    const safeQty = product ? Math.min(quantity, product.stock) : quantity;

    this.update((items) =>
      items.map((i) => (i.productId === productId ? { ...i, quantity: safeQty } : i)),
    );
  }

  increase(productId: number): void {
    const line = this.itemsState().find((i) => i.productId === productId);
    if (line) {
      this.setQuantity(productId, line.quantity + 1);
    }
  }

  decrease(productId: number): void {
    const line = this.itemsState().find((i) => i.productId === productId);
    if (line) {
      this.setQuantity(productId, line.quantity - 1);
    }
  }

  remove(productId: number): void {
    this.update((items) => items.filter((i) => i.productId !== productId));
  }

  clear(): void {
    this.update(() => []);
  }

  /** Used by OrderService when re-ordering a past order. */
  addMany(lines: { productId: number; quantity: number }[]): void {
    for (const line of lines) {
      const product = this.productService.getById(line.productId);
      if (product) {
        this.add(product, line.quantity);
      }
    }
  }

  private update(changes: (items: CartItem[]) => CartItem[]): void {
    const before = this.itemsState();
    const next = changes(before);
    this.itemsState.set(next);

    if (!this.backend.enabled) {
      save(STORAGE_KEY, next);
      return;
    }
    this.queueSave(before, next);
  }

  /** Sends only what changed to the `cart_items` table. */
  private queueSave(before: CartItem[], after: CartItem[]): void {
    const user = this.auth.user();
    if (!user || user.role !== 'user') return;

    const sb = this.backend.client;
    const changed = after.filter((a) => before.find((b) => b.productId === a.productId)?.quantity !== a.quantity);
    const removed = before.filter((b) => !after.some((a) => a.productId === b.productId));

    this.pending = this.pending.then(async () => {
      try {
        if (changed.length > 0) {
          await sb
            .from('cart_items')
            .upsert(changed.map((c) => ({ user_id: user.id, product_id: c.productId, quantity: c.quantity })));
        }
        if (removed.length > 0) {
          await sb
            .from('cart_items')
            .delete()
            .eq('user_id', user.id)
            .in('product_id', removed.map((r) => r.productId));
        }
      } catch {
        // Offline: the next load shows what the server really has.
      }
    });
  }

  private async load(userId: string): Promise<void> {
    const { data, error } = await this.backend.client
      .from('cart_items')
      .select('product_id, quantity')
      .eq('user_id', userId);
    if (error || !data) return;
    this.itemsState.set(data.map((r) => ({ productId: r.product_id as number, quantity: r.quantity as number })));
  }
}
