import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { AdminReviewsPage } from './admin-reviews.page';
import { ReviewService } from '../../services/review.service';

describe('AdminReviewsPage', () => {
  beforeEach(async () => {
    localStorage.removeItem('munchrise.reviews');
    await TestBed.configureTestingModule({ imports: [AdminReviewsPage], providers: [provideRouter([])] }).compileComponents();
  });

  it('shows the average rating and each review with its product name', () => {
    const fixture = TestBed.createComponent(AdminReviewsPage);
    TestBed.inject(ReviewService).add(1, 5, 'Great!', 'Abi');
    fixture.detectChanges();
    const page = fixture.componentInstance;

    expect(page.reviews().length).toBeGreaterThan(0);
    expect(page.reviews()[0].productName).not.toBe('');
    expect(page.average()).toBeGreaterThan(0);
    expect(page.distribution().map((d) => d.star)).toEqual([5, 4, 3, 2, 1]);
  });

  it('splits reviews by product category and by star rating', () => {
    const fixture = TestBed.createComponent(AdminReviewsPage);
    const reviews = TestBed.inject(ReviewService);
    reviews.add(1, 5, 'Great!', 'Abi');
    reviews.add(1, 2, 'Meh', 'Ben');
    const page = fixture.componentInstance;
    const category = page.inCategory().find((r) => r.productId === 1)!.category;

    page.selectCategory(category);
    expect(page.inCategory().every((r) => r.category === category)).toBe(true);
    expect(page.categoryCount('All')).toBeGreaterThanOrEqual(page.categoryCount(category));

    page.ratingFilter.set(2);
    expect(page.reviews().every((r) => r.rating === 2)).toBe(true);
    expect(page.ratingCount(0)).toBe(page.inCategory().length);

    page.selectCategory('All');
    page.ratingFilter.set(0);
    expect(page.reviews().length).toBe(page.categoryCount('All'));
  });
});
