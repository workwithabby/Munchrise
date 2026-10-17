import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular';

import { AdminPage } from './admin.page';
import { CartService } from '../../services/cart.service';
import { FavoritesService } from '../../services/favorites.service';
import { ProductService } from '../../services/product.service';

describe('AdminPage', () => {
  /** The delete-confirmation alerts (no real overlay in tests). */
  let shownAlerts: {
    header?: string;
    message?: string;
    buttons?: { text: string; role?: string }[];
  }[];

  beforeEach(async () => {
    localStorage.removeItem('munchrise.cart');
    localStorage.removeItem('munchrise.orders');
    localStorage.removeItem('munchrise.products');
    localStorage.removeItem('munchrise.favorites');
    localStorage.removeItem('munchrise.reviews');

    shownAlerts = [];
    const fakeAlertController = {
      create: async (options: {
        header?: string;
        message?: string;
        buttons?: { text: string; role?: string }[];
      }) => {
        shownAlerts.push(options);
        return { present: async () => {} };
      },
    };

    await TestBed.configureTestingModule({
      imports: [AdminPage],
      providers: [
        provideRouter([]),
        { provide: AlertController, useValue: fakeAlertController },
      ],
    }).compileComponents();
  });

  it('lists every product with its stock', () => {
    const fixture = TestBed.createComponent(AdminPage);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('ion-item');
    expect(rows.length).toBe(29);
    expect(fixture.nativeElement.textContent).toContain('in stock');
  });

  it('filters products by search', () => {
    const fixture = TestBed.createComponent(AdminPage);
    fixture.detectChanges();

    fixture.componentInstance.search.set('Hamwich');
    fixture.detectChanges();

    const names = Array.from(
      fixture.nativeElement.querySelectorAll('.product-name') as NodeListOf<HTMLElement>,
    ).map((el) => el.textContent?.trim());
    expect(names.length).toBeGreaterThan(0);
    expect(names.every((name) => name?.toLowerCase().includes('hamwich'))).toBe(true);
  });

  it('opens the add form and creates a new product', async () => {
    const fixture = TestBed.createComponent(AdminPage);
    fixture.detectChanges();

    fixture.componentInstance.startAdd();
    fixture.detectChanges();
    // the form lives in a modal (not rendered in unit tests), so check its state
    expect(fixture.componentInstance.formOpen()).toBe(true);
    expect(fixture.componentInstance.editingId()).toBeNull();

    fixture.componentInstance.fName.set('Mango Boost');
    fixture.componentInstance.fDescription.set('Fresh mango shake.');
    fixture.componentInstance.fCategory.set('Sides');
    fixture.componentInstance.fPrice.set('85');
    fixture.componentInstance.fStock.set('12');
    await fixture.componentInstance.saveForm();
    fixture.detectChanges();

    const products = TestBed.inject(ProductService);
    const added = products.getAll().find((p) => p.name === 'Mango Boost');
    expect(added).toBeTruthy();
    expect(added?.price).toBe(85);
    expect(added?.stock).toBe(12);
    expect(added?.category).toBe('Sides');
    expect(fixture.componentInstance.formOpen()).toBe(false);
  });

  it('shows clear messages for an invalid product form', async () => {
    const fixture = TestBed.createComponent(AdminPage);
    fixture.detectChanges();
    fixture.componentInstance.startAdd();

    await fixture.componentInstance.saveForm();
    expect(fixture.componentInstance.formError()).toContain('name');

    fixture.componentInstance.fName.set('X');
    await fixture.componentInstance.saveForm();
    expect(fixture.componentInstance.formError()).toContain('description');

    fixture.componentInstance.fDescription.set('Y');
    fixture.componentInstance.fPrice.set('0');
    await fixture.componentInstance.saveForm();
    expect(fixture.componentInstance.formError()).toContain('Price');

    fixture.componentInstance.fPrice.set('50');
    fixture.componentInstance.fStock.set('-1');
    await fixture.componentInstance.saveForm();
    expect(fixture.componentInstance.formError()).toContain('Stock');

    expect(fixture.componentInstance.formOpen()).toBe(true);
    expect(TestBed.inject(ProductService).getAll().length).toBe(29);
  });

  it('edits an existing product', async () => {
    const fixture = TestBed.createComponent(AdminPage);
    fixture.detectChanges();
    const products = TestBed.inject(ProductService);
    const target = products.getById(1)!;

    fixture.componentInstance.startEdit(target);
    fixture.detectChanges();
    expect(fixture.componentInstance.formOpen()).toBe(true);
    expect(fixture.componentInstance.editingId()).toBe(1);
    expect(fixture.componentInstance.fName()).toBe(target.name);

    fixture.componentInstance.fName.set('Better Breakfast');
    fixture.componentInstance.fPrice.set('199');
    fixture.componentInstance.fStock.set('7');
    await fixture.componentInstance.saveForm();

    expect(products.getById(1)?.name).toBe('Better Breakfast');
    expect(products.getById(1)?.price).toBe(199);
    expect(products.getById(1)?.stock).toBe(7);
  });

  it('asks before deleting, then removes the product everywhere', async () => {
    const fixture = TestBed.createComponent(AdminPage);
    fixture.detectChanges();
    const products = TestBed.inject(ProductService);
    const target = products.getById(5)!;

    TestBed.inject(CartService).add(target);
    TestBed.inject(FavoritesService).add(target.id);

    await fixture.componentInstance.askDelete(target);
    expect(shownAlerts.length).toBe(1);
    expect(shownAlerts[0].header).toBe('Delete product?');
    expect(shownAlerts[0].buttons?.map((b) => b.text)).toEqual(['Cancel', 'Delete']);

    await fixture.componentInstance.deleteProduct(target);

    expect(products.getById(5)).toBeUndefined();
    expect(products.getAll().length).toBe(28);
    expect(TestBed.inject(CartService).detailedItems().some((l) => l.product.id === 5)).toBe(false);
    expect(TestBed.inject(FavoritesService).has(5)).toBe(false);
  });

  it('refreshes the list and the counts right after adding a product', async () => {
    const fixture = TestBed.createComponent(AdminPage);
    fixture.detectChanges();
    const before = fixture.componentInstance.products().length;

    fixture.componentInstance.startAdd();
    fixture.componentInstance.fName.set('Mango Boost');
    fixture.componentInstance.fDescription.set('Fresh mango shake.');
    fixture.componentInstance.fPrice.set('85');
    fixture.componentInstance.fStock.set('0');
    await fixture.componentInstance.saveForm();

    expect(fixture.componentInstance.products().length).toBe(before + 1);
    expect(fixture.componentInstance.stats().total).toBe(before + 1);
    expect(fixture.componentInstance.stats().out).toBeGreaterThan(0);
  });

  it('filters by stock level from the stat cards', () => {
    const fixture = TestBed.createComponent(AdminPage);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.setStockFilter('out');
    expect(component.products().length).toBe(component.stats().out);
    expect(component.products().every((p) => p.stock === 0)).toBe(true);

    // tapping the active card again clears the filter
    component.setStockFilter('out');
    expect(component.products().length).toBe(component.stats().total);
  });

  it('changes stock with the +/- buttons and never goes below 0', () => {
    const fixture = TestBed.createComponent(AdminPage);
    fixture.detectChanges();
    const products = TestBed.inject(ProductService);
    const target = products.getById(1)!;
    const start = target.stock;

    fixture.componentInstance.changeStock(target, 1);
    expect(products.getById(1)?.stock).toBe(start + 1);

    fixture.componentInstance.changeStock(target, -(start + 10));
    expect(products.getById(1)?.stock).toBe(0);
    expect(fixture.componentInstance.stats().out).toBeGreaterThan(0);
  });

  it('groups the list by category and keeps the counts in step', () => {
    const fixture = TestBed.createComponent(AdminPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const category = page.categories[0];

    expect(page.categoryTabs[0]).toBe('All');
    page.selectCategory(category);

    expect(page.products().length).toBeGreaterThan(0);
    expect(page.products().every((p) => p.category === category)).toBe(true);
    expect(page.categoryCounts()[category]).toBe(page.products().length);
    expect(page.categoryCounts()['All']).toBe(page.stats().total);
  });
});
