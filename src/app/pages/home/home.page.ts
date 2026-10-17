import { computed, Component, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { CartButtonComponent } from '../../components/cart-button/cart-button.component';
import { NotificationBellComponent } from '../../components/notification-bell/notification-bell.component';
import { OrderProgressComponent } from '../../components/order-progress/order-progress.component';
import { categoryCover } from '../../components/product-image/food-icons';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { ProductImageComponent } from '../../components/product-image/product-image.component';
import { DragScrollDirective } from '../../directives/drag-scroll.directive';
import { DELIVERY_FEE, FREE_DELIVERY_MIN } from '../../data/promos';
import { Order } from '../../models/order.model';
import { Product } from '../../models/product.model';
import { PesoPipe } from '../../pipes/peso.pipe';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { PromoService } from '../../services/promo.service';
import { ProductService } from '../../services/product.service';
import { RewardsService } from '../../services/rewards.service';

interface PromoCard {
  title: string;
  text: string;
  /** Tap to copy this code (none for the free-delivery card). */
  code?: string;
  icon: string;
  tone: 'orange' | 'teal' | 'mustard';
}

interface CategoryTile {
  name: string;
  count: number;
  gradient: string;
  icon: SafeHtml;
}

/**
 * Home: a discovery page. It does not list the whole menu (that is the Menu
 * tab); it points people at things to order: today's pick, promos, categories,
 * best sellers, top rated, a quick "order again" and their rewards.
 */
@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CartButtonComponent,
    DragScrollDirective,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonMenuButton,
    IonSearchbar,
    IonTitle,
    IonToolbar,
    NotificationBellComponent,
    OrderProgressComponent,
    PesoPipe,
    ProductCardComponent,
    ProductImageComponent,
    RouterLink,
  ],
})
export class HomePage {
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly promoService = inject(PromoService);
  private readonly toastController = inject(ToastController);
  protected readonly auth = inject(AuthService);
  protected readonly rewards = inject(RewardsService);

  /** The newest order that has not been delivered yet (shown as a tracking banner). */
  readonly activeOrder = computed(() => this.orderService.activeOrders()[0]);

  readonly searchValue = signal('');
  protected readonly freeDeliveryMin = FREE_DELIVERY_MIN;

  /** "Good morning, Abigail!" for the time of day. */
  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const first = this.auth.isUser() ? this.auth.displayName().split(' ')[0] : '';
    return first ? `${part}, ${first}!` : `${part}!`;
  });

  /** The active promo codes (live from the database) plus the free-delivery offer. */
  readonly promos = computed<PromoCard[]>(() => [
    ...this.promoService.active().map<PromoCard>((promo, index) => ({
      title: promo.description,
      text: 'Tap to copy the code, then use it at checkout.',
      code: promo.code,
      icon: 'pricetags-outline',
      tone: index % 2 === 0 ? 'orange' : 'teal',
    })),
    {
      title: `Free delivery over ₱${FREE_DELIVERY_MIN}`,
      text: `Otherwise just ₱${DELIVERY_FEE}. Add a little more and ride free.`,
      icon: 'bicycle-outline',
      tone: 'mustard',
    },
  ]);

  /** One chip per category under the search bar: opens the Menu already filtered. */
  readonly categoryTiles = computed<CategoryTile[]>(() =>
    this.productService.getCategories().map((name) => {
      const cover = categoryCover(name);
      return {
        name,
        count: this.productService.query({ category: name }).length,
        gradient: cover.gradient,
        icon: this.sanitizer.bypassSecurityTrustHtml(cover.icon),
      };
    }),
  );

  readonly bestSellers = computed<Product[]>(() => this.productService.getBestSellers());

  /** Highest rated items that are not already in the best sellers row. */
  readonly topRated = computed<Product[]>(() =>
    this.productService
      .query({ sort: 'rating', inStockOnly: true })
      .filter((p) => !p.isBestSeller)
      .slice(0, 6),
  );

  /** A different featured item each day (same all day, so it feels like a real "pick"). */
  readonly pickOfTheDay = computed<Product | undefined>(() => {
    const list = this.productService.query({ inStockOnly: true, sort: 'name' });
    if (list.length === 0) return undefined;
    const day = Math.floor(Date.now() / 86_400_000);
    return list[day % list.length];
  });

  /** The last few orders, for a one-tap "order again". Members only. */
  readonly orderAgain = computed(() =>
    this.auth.isUser() ? this.orderService.orders().slice(0, 3) : [],
  );

  /** Points progress toward the next voucher (members). */
  readonly pointsToNext = computed(() => {
    const next = this.rewards.nextTier();
    return next ? Math.max(0, next.points - this.rewards.points()) : 0;
  });

  onSearchInput(event: CustomEvent<{ value?: string | null }>): void {
    this.searchValue.set(event.detail.value ?? '');
  }

  /** Searching happens on the Menu page, which has the filters. */
  search(term = this.searchValue()): void {
    void this.router.navigate(['/products'], { queryParams: term.trim() ? { q: term.trim() } : {} });
  }

  openCategory(name: string): void {
    void this.router.navigate(['/products'], { queryParams: { category: name } });
  }

  async copyCode(code: string | undefined): Promise<void> {
    if (!code) return;
    try {
      await navigator.clipboard?.writeText(code);
    } catch {
      // Clipboard blocked: the toast still shows the code to type in.
    }
    await this.toast(`Code ${code} copied. Use it at checkout!`);
  }

  async reorder(order: Order): Promise<void> {
    const result = this.orderService.reorder(order.id);
    await this.toast(result.message);
  }

  orderSummary(order: Order): string {
    const names = order.items.map((line) => `${line.quantity}× ${line.name}`);
    return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2} more` : names.join(', ');
  }

  private async toast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1800, position: 'top', color: 'primary' });
    await toast.present();
  }
}
