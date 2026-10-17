import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProductsPage } from './products.page';

describe('ProductsPage', () => {
  beforeEach(async () => {
    localStorage.removeItem('munchrise.cart');
    await TestBed.configureTestingModule({
      imports: [ProductsPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('lists all 29 products', () => {
    const fixture = TestBed.createComponent(ProductsPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.product-grid app-product-card').length).toBe(29);
  });

  it('filters by search text', () => {
    const fixture = TestBed.createComponent(ProductsPage);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.search.set('blueberry');
    fixture.detectChanges();

    expect(component.results().length).toBe(1);
    expect(component.results()[0].name).toBe('Berry Rise');
  });

  it('sorts by price from low to high', () => {
    const fixture = TestBed.createComponent(ProductsPage);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.sort.set('price-asc');
    const prices = component.results().map((p) => p.price);

    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it('filters by dietary tag', () => {
    const fixture = TestBed.createComponent(ProductsPage);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.toggleDietary('vegan');
    expect(component.results().length).toBe(1);
    expect(component.results()[0].name).toBe('Sunny Fruit');
  });
});
