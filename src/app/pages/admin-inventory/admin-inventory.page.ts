import { computed, Component, inject, signal } from '@angular/core';
import { IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonMenuButton, IonSearchbar, IonTitle, IonToolbar, ToastController } from '@ionic/angular';
import { RoleTabBarComponent } from '../../components/role-tab-bar/role-tab-bar.component';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { ProductImageComponent } from '../../components/product-image/product-image.component';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product.service';

type Level = 'attention' | 'out' | 'low' | 'ok' | 'all';

/** Restock screen: stock health at a glance, with one-tap quantities. */
@Component({
  selector: 'app-admin-inventory',
  templateUrl: './admin-inventory.page.html',
  styleUrls: ['./admin-inventory.page.scss'],
  standalone: true,
  imports: [RoleTabBarComponent, IonFooter, EmptyStateComponent, IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonSearchbar, IonTitle, IonToolbar, ProductImageComponent],
})
export class AdminInventoryPage {
  private readonly productService = inject(ProductService);
  private readonly toastController = inject(ToastController);

  readonly restockAmounts = [5, 10, 25];
  readonly viewTabs: { id: Level; label: string }[] = [
    { id: 'attention', label: 'Needs restock' },
    { id: 'out', label: 'Out of stock' },
    { id: 'low', label: 'Low' },
    { id: 'ok', label: 'Well stocked' },
    { id: 'all', label: 'All products' },
  ];

  readonly view = signal<Level>('attention');
  readonly search = signal('');

  /** Tapping the active tile again goes back to "needs restock". */
  pick(level: Level): void {
    this.view.set(this.view() === level && level !== 'attention' ? 'attention' : level);
  }

  levelOf(product: Product): 'out' | 'low' | 'ok' {
    return product.stock === 0 ? 'out' : product.stock <= 5 ? 'low' : 'ok';
  }

  /** Fill of the stock meter: full at 50 or more. */
  meterPercent(product: Product): number {
    return Math.min(100, product.stock * 2);
  }

  readonly items = computed(() => {
    this.productService.revision();
    const view = this.view();
    const q = this.search().trim().toLowerCase();
    return [...this.productService.getAll()]
      .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name))
      .filter((p) => {
        const level = this.levelOf(p);
        return view === 'all' || (view === 'attention' ? level !== 'ok' : level === view);
      })
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  });

  readonly outCount = computed(() => {
    this.productService.revision();
    return this.productService.getAll().filter((p) => p.stock === 0).length;
  });

  readonly lowCount = computed(() => {
    this.productService.revision();
    return this.productService.getAll().filter((p) => p.stock > 0 && p.stock <= 5).length;
  });

  readonly healthyCount = computed(() => {
    this.productService.revision();
    return this.productService.getAll().filter((p) => p.stock > 5).length;
  });

  readonly totalUnits = computed(() => {
    this.productService.revision();
    return this.productService.getAll().reduce((sum, p) => sum + p.stock, 0);
  });

  async restock(product: Product, amount: number): Promise<void> {
    this.productService.adjustStock(product.id, amount);
    const toast = await this.toastController.create({
      message: `${product.name}: ${amount > 0 ? '+' : '−'}${Math.abs(amount)} (now ${product.stock})`,
      duration: 1200,
      position: 'top',
      color: 'primary',
    });
    await toast.present();
  }
}
