import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DevelopersPage } from './developers.page';

describe('DevelopersPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevelopersPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows one card per team member', () => {
    const fixture = TestBed.createComponent(DevelopersPage);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.member-card');
    expect(cards.length).toBe(5);
    expect(fixture.nativeElement.textContent).toContain('Crisostomo, John Steven G.');
    expect(fixture.nativeElement.textContent).toContain('Group Leader');
    expect(fixture.nativeElement.textContent).toContain('Dela Cruz, Abigail B.');
  });

  it('shows the class details', () => {
    const fixture = TestBed.createComponent(DevelopersPage);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('IT 005');
    expect(text).toContain('Technological Institute of the Philippines');
    expect(text).toContain('Santos');
  });

  it('builds initials from a name', () => {
    const component = TestBed.createComponent(DevelopersPage).componentInstance;
    expect(component.initials('Crisostomo, John Steven G.')).toBe('CJ');
    expect(component.initials('Dela Cruz, Abigail B.')).toBe('DA');
  });
});
