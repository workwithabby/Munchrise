import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FavoritesPage } from './favorites.page';
import { FavoritesService } from '../../services/favorites.service';

describe('FavoritesPage', () => {
  beforeEach(async () => {
    localStorage.removeItem('munchrise.favorites');
    await TestBed.configureTestingModule({
      imports: [FavoritesPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows an empty state when nothing is saved', () => {
    const fixture = TestBed.createComponent(FavoritesPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No favorites yet');
  });

  it('lists the saved products', () => {
    const favorites = TestBed.inject(FavoritesService);
    favorites.toggle(3); // Golden Hamwich
    favorites.toggle(6); // Berry Rise

    const fixture = TestBed.createComponent(FavoritesPage);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-product-card');
    expect(cards.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('2 saved items');
  });
});
