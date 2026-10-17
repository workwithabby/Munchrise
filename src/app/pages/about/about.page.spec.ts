import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AboutPage } from './about.page';

describe('AboutPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows the name, tagline and version', () => {
    const fixture = TestBed.createComponent(AboutPage);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Munchrise');
    expect(text).toContain('Rise, Munch, Repeat!');
    expect(text).toContain('v1.0.0');
  });

  it('lists the main features', () => {
    const fixture = TestBed.createComponent(AboutPage);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.feature-list li');
    expect(items.length).toBe(6);
    expect(fixture.nativeElement.textContent).toContain('RISE10');
  });
});
