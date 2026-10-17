import { inject, Injectable, signal } from '@angular/core';

import { CATEGORIES, DIETARY_TAGS, PRODUCTS } from '../data/products';
import { Product } from '../models/product.model';
import { load, save } from './storage';
import { SupabaseService } from './supabase.service';

const STORAGE_KEY = 'munchrise.products';

export type SortKey = 'name' | 'price-asc' | 'price-desc' | 'rating';

export interface ProductQuery {
  search?: string;
  category?: string;
  /** One tag or several — a product must have ALL of them. */
  dietary?: string | string[];
  minRating?: number;
  inStockOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortKey;
}

/** What the vendor fills in when adding or editing a product. */
export interface ProductInput {
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image?: string;
  isBestSeller?: boolean;
}

/** Same stand-in style as the seeded catalog (colors cycle like the data file). */
function placeholderImage(name: string, id: number): string {
  const color = ['DCA93E', 'C8481A', '2B8089'][(id - 1) % 3];
  return `https://placehold.co/600x400/${color}/FFF4DC.png?text=${encodeURIComponent(name).replace(/%20/g, '+')}`;
}

/**
 * The product catalog.
 *
 * - Backend mode (the real app): the `products` table in Supabase is the truth. The
 *   built-in seed list shows instantly while it loads, and live updates keep stock
 *   and admin edits in sync across every phone.
 * - Local mode (unit tests): the seed data in data/products.ts, with the vendor's
 *   edits kept in localStorage.
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly backend = inject(SupabaseService);
  private products: Product[];

  /**
   * Goes up on every add / edit / delete / stock change. The catalog is a plain
   * array, so screens read this inside computed() to know when to refresh.
   */
  readonly revision = signal(0);

  constructor() {
    if (this.backend.enabled) {
      this.products = [...PRODUCTS].map((p) => ({ ...p }));
      void this.refresh();
      this.listenForChanges();
      return;
    }

    const stored = load<Product[] | null>(STORAGE_KEY, null);
    this.products =
      stored && Array.isArray(stored) && stored.length > 0 ? stored : [...PRODUCTS];

    // A catalog saved by an older version has no photos: borrow them from the seed data
    // (photos the vendor set on purpose are never replaced).
    for (const product of this.products) {
      const seed = PRODUCTS.find((p) => p.id === product.id);
      if (seed?.image && (!product.image || product.image.includes('placehold.co'))) {
        product.image = seed.image;
      }
    }
  }

  /** Re-reads the whole catalog from Supabase (also called by live updates). */
  async refresh(): Promise<void> {
    if (!this.backend.enabled) return;
    const { data, error } = await this.backend.client.from('products').select('*').order('id');
    if (error || !data) return;

    this.products = data.map(fromRow);
    this.revision.update((n) => n + 1);
  }

  /** Stock or an admin edit changed somewhere: reload (waits a moment so bursts become one reload). */
  private listenForChanges(): void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    this.backend.client
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => void this.refresh(), 300);
      })
      .subscribe();
  }

  getAll(): Product[] {
    this.revision();
    return this.products;
  }

  getById(id: number): Product | undefined {
    this.revision();
    return this.products.find((p) => p.id === id);
  }

  getCategories(): string[] {
    return CATEGORIES;
  }

  getDietaryTags(): string[] {
    return DIETARY_TAGS;
  }

  getBestSellers(): Product[] {
    this.revision();
    return this.products.filter((p) => p.isBestSeller);
  }

  /** Lowest and highest price — used for the price filter sliders. */
  getPriceRange(): { min: number; max: number } {
    this.revision();
    const prices = this.products.map((p) => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }

  /** Search + filter + sort in one call. Every option is optional. */
  query(options: ProductQuery = {}): Product[] {
    this.revision();
    let list = [...this.products];
    const search = options.search?.trim().toLowerCase();

    if (search) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search) ||
          p.category.toLowerCase().includes(search),
      );
    }

    if (options.category && options.category !== 'All') {
      list = list.filter((p) => p.category === options.category);
    }

    const tags = ([] as string[]).concat(options.dietary ?? []).filter(Boolean);
    if (tags.length > 0) {
      list = list.filter((p) => tags.every((tag) => (p.dietary as string[]).includes(tag)));
    }

    if (options.minRating) {
      list = list.filter((p) => p.rating >= options.minRating!);
    }

    if (options.inStockOnly) {
      list = list.filter((p) => p.stock > 0);
    }

    if (options.minPrice !== undefined && !Number.isNaN(options.minPrice)) {
      list = list.filter((p) => p.price >= options.minPrice!);
    }

    if (options.maxPrice !== undefined && !Number.isNaN(options.maxPrice)) {
      list = list.filter((p) => p.price <= options.maxPrice!);
    }

    return this.sort(list, options.sort);
  }

  sort(list: Product[], key: SortKey = 'name'): Product[] {
    const sorted = [...list];

    switch (key) {
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return sorted;
  }

  /** Vendor adds a product — id is generated, missing fields get safe defaults. */
  async add(input: ProductInput): Promise<Product> {
    let id = this.products.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    const name = input.name.trim();

    const product: Product = {
      id,
      name,
      description: input.description.trim(),
      category: input.category,
      price: input.price,
      image: input.image?.trim() || placeholderImage(name, id),
      nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      stock: input.stock,
      rating: 0, // no reviews yet — cards/details hide a 0 rating
      isBestSeller: input.isBestSeller ?? false,
      dietary: [],
    };

    if (this.backend.enabled) {
      // The database picks the real id.
      const { data, error } = await this.backend.client
        .from('products')
        .insert(toRow(product, false))
        .select()
        .single();
      if (error || !data) throw new Error(error?.message ?? 'Could not add the product.');
      id = data.id;
      product.id = id;
    }

    this.products.push(product);
    this.saveAll();
    return product;
  }

  /** Vendor edits a product (only the fields that are provided change). */
  update(id: number, patch: ProductInput): Product | undefined {
    const product = this.getById(id);
    if (!product) return undefined;

    product.name = patch.name.trim();
    product.description = patch.description.trim();
    product.category = patch.category;
    product.price = patch.price;
    product.stock = patch.stock;
    product.image = patch.image?.trim() || placeholderImage(product.name, product.id);
    product.isBestSeller = patch.isBestSeller ?? product.isBestSeller;

    this.saveAll();
    this.writeBack(this.backend.client?.from('products').update(toRow(product, false)).eq('id', id));
    return product;
  }

  /** Vendor nudges the stock up or down (never below 0). */
  adjustStock(id: number, delta: number): Product | undefined {
    const product = this.getById(id);
    if (!product) return undefined;

    product.stock = Math.max(0, product.stock + delta);
    this.saveAll();
    this.writeBack(this.backend.client?.from('products').update({ stock: product.stock }).eq('id', id));
    return product;
  }

  /** Vendor deletes a product. Returns false when the id does not exist. */
  remove(id: number): boolean {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return false;

    this.products.splice(index, 1);
    this.saveAll();
    this.writeBack(this.backend.client?.from('products').delete().eq('id', id));
    return true;
  }

  /** The screen updates first; if the server refuses, show what it really has. */
  private writeBack(request: PromiseLike<{ error: unknown }> | undefined): void {
    if (!this.backend.enabled || !request) return;
    void Promise.resolve(request).then(({ error }) => {
      if (error) void this.refresh();
    });
  }

  private saveAll(): void {
    if (!this.backend.enabled) save(STORAGE_KEY, this.products);
    this.revision.update((n) => n + 1);
  }
}

/** A database row -> the app's Product. */
function fromRow(row: Record<string, unknown>): Product {
  return {
    id: row['id'] as number,
    name: row['name'] as string,
    description: (row['description'] as string) ?? '',
    category: row['category'] as string,
    price: Number(row['price']),
    image: (row['image'] as string) ?? '',
    stock: row['stock'] as number,
    rating: Number(row['rating']),
    isBestSeller: row['is_best_seller'] as boolean,
    dietary: (row['dietary'] as Product['dietary']) ?? [],
    nutrition: (row['nutrition'] as Product['nutrition']) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 },
  };
}

/** The app's Product -> a database row (the id is left out when inserting). */
function toRow(product: Product, withId: boolean): Record<string, unknown> {
  return {
    ...(withId ? { id: product.id } : {}),
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    image: product.image,
    stock: product.stock,
    is_best_seller: product.isBestSeller,
    dietary: product.dietary,
    nutrition: product.nutrition,
  };
}
