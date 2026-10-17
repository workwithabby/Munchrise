import { TestBed } from '@angular/core/testing';

import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(() => {
    localStorage.removeItem('munchrise.products');
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductService);
  });

  it('has all 29 products', () => {
    expect(service.getAll().length).toBe(29);
  });

  it('finds a product by id', () => {
    expect(service.getById(3)?.name).toBe('Golden Hamwich');
    expect(service.getById(999)).toBeUndefined();
  });

  it('returns the 7 categories', () => {
    expect(service.getCategories().length).toBe(7);
    expect(service.getCategories()).toContain('Rice Bowls');
  });

  it('searches by name', () => {
    const results = service.query({ search: 'hamwich' });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe(3);
  });

  it('filters by category', () => {
    const results = service.query({ category: 'Sides' });
    expect(results.length).toBeGreaterThan(0);
    results.forEach((p) => expect(p.category).toBe('Sides'));
  });

  it('filters by price', () => {
    const results = service.query({ maxPrice: 80 });
    results.forEach((p) => expect(p.price).toBeLessThanOrEqual(80));
  });

  it('sorts by price ascending', () => {
    const results = service.query({ sort: 'price-asc' });
    for (let i = 1; i < results.length; i++) {
      expect(results[i].price).toBeGreaterThanOrEqual(results[i - 1].price);
    }
  });

  it('marks about five best sellers', () => {
    expect(service.getBestSellers().length).toBe(5);
  });

  it('adds a new product with a generated id', async () => {
    const product = await service.add({
      name: 'Choco Sunrise',
      description: 'Warm chocolate drink.',
      category: 'Sides',
      price: 75,
      stock: 10,
    });

    expect(product.id).toBe(30);
    expect(product.rating).toBe(0);
    expect(product.image).toContain('placehold.co');
    expect(service.getById(30)?.name).toBe('Choco Sunrise');
    expect(service.getAll().length).toBe(30);
  });

  it('saves vendor changes to localStorage', async () => {
    await service.add({
      name: 'Test Bun',
      description: 'A bun.',
      category: 'Sides',
      price: 40,
      stock: 3,
    });

    const stored = JSON.parse(localStorage.getItem('munchrise.products') ?? '[]') as {
      name: string;
    }[];
    expect(stored.some((p) => p.name === 'Test Bun')).toBe(true);
  });

  it('updates a product', () => {
    const before = service.getById(1)!;
    const updated = service.update(1, {
      name: 'Renamed Toast',
      description: before.description,
      category: before.category,
      price: 99,
      stock: 5,
      image: before.image,
      isBestSeller: true,
    });

    expect(updated?.name).toBe('Renamed Toast');
    expect(updated?.price).toBe(99);
    expect(service.getById(1)?.price).toBe(99);
  });

  it('refuses to update a product that does not exist', () => {
    const missing = service.update(999, {
      name: 'Ghost',
      description: 'x',
      category: 'Sides',
      price: 10,
      stock: 1,
    });
    expect(missing).toBeUndefined();
  });

  it('deletes a product', () => {
    expect(service.remove(1)).toBe(true);
    expect(service.getById(1)).toBeUndefined();
    expect(service.getAll().length).toBe(28);
    expect(service.remove(1)).toBe(false);
  });
});
