import { TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular';

import { AdminInventoryPage } from './admin-inventory.page';
import { ProductService } from '../../services/product.service';

describe('AdminInventoryPage', () => {
  beforeEach(async () => {
    localStorage.removeItem('munchrise.products');
    await TestBed.configureTestingModule({
      imports: [AdminInventoryPage],
      providers: [{ provide: ToastController, useValue: { create: async () => ({ present: async () => {} }) } }],
    }).compileComponents();
  });

  it('lists only low or empty products, lowest stock first', () => {
    const fixture = TestBed.createComponent(AdminInventoryPage);
    const products = TestBed.inject(ProductService);
    products.adjustStock(2, -products.getById(2)!.stock);

    const items = fixture.componentInstance.items();
    expect(items.some((p) => p.id === 2)).toBe(true);
    expect(items.every((p) => p.stock <= 5)).toBe(true);
    // lowest stock first
    expect(items.map((p) => p.stock)).toEqual([...items.map((p) => p.stock)].sort((a, b) => a - b));
  });

  it('restocks a product and updates the counts', async () => {
    const fixture = TestBed.createComponent(AdminInventoryPage);
    const products = TestBed.inject(ProductService);
    products.adjustStock(2, -products.getById(2)!.stock);
    const out = fixture.componentInstance.outCount();
    expect(out).toBeGreaterThan(0);

    await fixture.componentInstance.restock(products.getById(2)!, 10);

    expect(products.getById(2)?.stock).toBe(10);
    expect(fixture.componentInstance.outCount()).toBe(out - 1);
  });
});
