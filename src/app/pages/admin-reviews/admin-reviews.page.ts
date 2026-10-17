import { DatePipe } from '@angular/common';
import { computed, Component, inject, signal } from '@angular/core';
import { IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar, IonFooter } from '@ionic/angular';
import { RoleTabBarComponent } from '../../components/role-tab-bar/role-tab-bar.component';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { ProductService } from '../../services/product.service';
import { ReviewService } from '../../services/review.service';

/** What customers say about each product, newest first. */
@Component({
  selector: 'app-admin-reviews',
  templateUrl: './admin-reviews.page.html',
  styleUrls: ['./admin-reviews.page.scss'],
  standalone: true,
  imports: [RoleTabBarComponent, IonFooter, DatePipe, EmptyStateComponent, IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar],
})
export class AdminReviewsPage {
  private readonly reviewService = inject(ReviewService);
  private readonly productService = inject(ProductService);

  readonly stars = [1, 2, 3, 4, 5];

  readonly categoryFilter = signal('All');
  /** 0 = every rating. */
  readonly ratingFilter = signal(0);
  readonly categoryTabs: string[] = ['All', ...this.productService.getCategories()];
  readonly ratingTabs = [0, 5, 4, 3, 2, 1];

  /** Every review with its product, newest first. */
  private readonly allReviews = computed(() =>
    this.reviewService
      .all()
      .map((review) => {
        const product = this.productService.getById(review.productId);
        return {
          ...review,
          productName: product?.name ?? 'Removed product',
          category: product?.category ?? 'Other',
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );

  /** Reviews in the chosen category (the summary + rating chips use these). */
  readonly inCategory = computed(() => {
    const category = this.categoryFilter();
    return this.allReviews().filter((r) => category === 'All' || r.category === category);
  });

  /** What the list shows: category + rating. */
  readonly reviews = computed(() => {
    const rating = this.ratingFilter();
    return this.inCategory().filter((r) => rating === 0 || r.rating === rating);
  });

  readonly average = computed(() => {
    const list = this.inCategory();
    return list.length === 0 ? 0 : list.reduce((sum, r) => sum + r.rating, 0) / list.length;
  });

  /** Count of 1-5 star reviews in the category, for the little distribution bars. */
  readonly distribution = computed(() =>
    [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: this.inCategory().filter((r) => r.rating === star).length,
    })),
  );

  categoryCount(category: string): number {
    return this.allReviews().filter((r) => category === 'All' || r.category === category).length;
  }

  ratingCount(rating: number): number {
    return rating === 0 ? this.inCategory().length : this.inCategory().filter((r) => r.rating === rating).length;
  }

  selectCategory(category: string, event?: Event): void {
    this.categoryFilter.set(category);
    (event?.currentTarget as HTMLElement | null)?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }

  readonly maxCount = computed(() => Math.max(1, ...this.distribution().map((d) => d.count)));
}
