import { NotificationBellComponent } from '../../components/notification-bell/notification-bell.component';
import { computed, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonRange,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import type { RangeChangeEventDetail } from '@ionic/angular';

import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { PesoPipe } from '../../pipes/peso.pipe';
import { CartService } from '../../services/cart.service';
import { ProductService, SortKey } from '../../services/product.service';

import { CartButtonComponent } from '../../components/cart-button/cart-button.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
/** Full menu with search, filters and sorting. */
@Component({
  selector: 'app-products',
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
  standalone: true,
  imports: [
    NotificationBellComponent,
    CartButtonComponent,
    EmptyStateComponent,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonMenuButton,
    IonRange,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    PesoPipe,
    ProductCardComponent,
  ],
})
export class ProductsPage {
  private readonly productService = inject(ProductService);
  readonly cart = inject(CartService);

  readonly priceRange = this.productService.getPriceRange();
  readonly categories: string[] = ['All', ...this.productService.getCategories()];
  readonly dietaryTags: string[] = this.productService.getDietaryTags();
  readonly sortOptions: { label: string; value: SortKey }[] = [
    { label: 'Name (A–Z)', value: 'name' },
    { label: 'Price: low to high', value: 'price-asc' },
    { label: 'Price: high to low', value: 'price-desc' },
    { label: 'Top rated', value: 'rating' },
  ];

  /** Set by links from Home: /products?q=pancakes and /products?category=Sides. */
  readonly q = input('');
  readonly category = input('');

  readonly search = signal('');
  readonly selectedCategory = signal('All');
  readonly dietary = signal<string[]>([]);
  readonly minRating = signal(0);
  readonly inStockOnly = signal(false);
  readonly ratingOptions = [0, 4, 4.5];
  readonly sort = signal<SortKey>('name');
  readonly minPrice = signal(this.priceRange.min);
  readonly maxPrice = signal(this.priceRange.max);
  readonly showFilters = signal(false);

  private readonly applyParams = effect(() => {
    const q = this.q();
    const cat = this.category();
    if (q) this.search.set(q);
    if (cat && this.categories.includes(cat)) this.selectedCategory.set(cat);
  });

  readonly results = computed(() =>
    this.productService.query({
      search: this.search(),
      category: this.selectedCategory(),
      dietary: this.dietary(),
      minRating: this.minRating(),
      inStockOnly: this.inStockOnly(),
      minPrice: this.minPrice(),
      maxPrice: this.maxPrice(),
      sort: this.sort(),
    }),
  );

  /** How many items each category tab would show (with the other filters applied). */
  readonly categoryCounts = computed(() => {
    const base = {
      search: this.search(),
      dietary: this.dietary(),
      minRating: this.minRating(),
      inStockOnly: this.inStockOnly(),
      minPrice: this.minPrice(),
      maxPrice: this.maxPrice(),
    };
    const counts: Record<string, number> = {};
    for (const item of this.categories) {
      counts[item] = this.productService.query({ ...base, category: item }).length;
    }
    return counts;
  });

  readonly activeFilterCount = computed(
    () =>
      this.dietary().length +
      (this.minRating() > 0 ? 1 : 0) +
      (this.inStockOnly() ? 1 : 0) +
      (this.minPrice() !== this.priceRange.min || this.maxPrice() !== this.priceRange.max ? 1 : 0),
  );

  readonly hasActiveFilters = computed(
    () =>
      this.dietary().length > 0 ||
      this.minRating() > 0 ||
      this.inStockOnly() ||
      this.minPrice() !== this.priceRange.min ||
      this.maxPrice() !== this.priceRange.max,
  );

  onSearch(event: CustomEvent<{ value?: string | null }>): void {
    this.search.set(event.detail.value ?? '');
  }

  onSortChange(event: CustomEvent<{ value?: SortKey }>): void {
    if (event.detail.value) {
      this.sort.set(event.detail.value);
    }
  }

  onPriceChange(event: CustomEvent<RangeChangeEventDetail>): void {
    const value = event.detail.value;

    // dual-knob ranges can report [min, max] or { lower, upper }
    if (Array.isArray(value)) {
      this.minPrice.set(value[0]);
      this.maxPrice.set(value[1]);
    } else if (value && typeof value === 'object' && 'lower' in value) {
      this.minPrice.set(value.lower);
      this.maxPrice.set(value.upper);
    }
  }

  selectCategory(category: string, event?: Event): void {
    this.selectedCategory.set(category);
    // keep the chosen chip in view when the row is scrolled
    (event?.currentTarget as HTMLElement | null)?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }

  toggleDietary(tag: string): void {
    this.dietary.update((list) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]));
  }

  setMinRating(value: number): void {
    this.minRating.set(this.minRating() === value ? 0 : value);
  }

  toggleInStock(): void {
    this.inStockOnly.update((v) => !v);
  }

  toggleFilters(): void {
    this.showFilters.update((value) => !value);
  }

  clearFilters(): void {
    this.dietary.set([]);
    this.minRating.set(0);
    this.inStockOnly.set(false);
    this.minPrice.set(this.priceRange.min);
    this.maxPrice.set(this.priceRange.max);
  }
}
