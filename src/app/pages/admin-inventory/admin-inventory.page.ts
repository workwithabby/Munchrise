import { computed, Component, inject, signal } from '@angular/core';
import { IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar, ToastController, IonFooter } from '@ionic/angular';
import { RoleTabBarComponent } from '../../components/role-tab-bar/role-tab-bar.component';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { ProductImageComponent } from '../../components/product-image/product-image.component';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product.service';

type Level = 'attention' | 'all';

/** Restock screen: products that are low or out, with one-tap quantities. */
@Component({
  selector: 'app-admin-inventory',
  templateUrl: './admin-inventory.page.html',
  styleUrls: ['./admin-inventory.page.scss'],
  standalone: true,
  imports: [RoleTabBarComponent, IonFooter, EmptyStateComponent, IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar, ProductImageComponent],
})
export class AdminInventoryPage {
  private readonly productService = inject(ProductService);
  private readonly toastController = inject(ToastController);

  readonly restockAmounts = [5, 10, 25];
  readonly view = signal<Level>('attention');

  readonly items = computed(() => {
    this.productService.revision();
    const all = [...this.productService.getAll()].sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));
    return this.view() === 'attention' ? all.filter((p) => p.stock <= 5) : all;
  });

  readonly outCount = computed(() => {
    this.productService.revision();
    return this.productService.getAll().filter((p) => p.stock === 0).length;
  });

  readonly lowCount = computed(() => {
    this.productService.revision();
    return this.productService.getAll().filter((p) => p.stock > 0 && p.stock <= 5).length;
  });

  async restock(product: Product, amount: number): Promise<void> {
    this.productService.adjustStock(product.id, amount);
    const toast = await this.toastController.create({
      message: `${product.name}: +${amount} (now ${product.stock})`,
      duration: 1400,
      position: 'top',
      color: 'primary',
    });
    await toast.present();
  }
}
