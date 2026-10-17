import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HelpPage } from './help.page';

describe('HelpPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the FAQ list and contact rows', () => {
    const fixture = TestBed.createComponent(HelpPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.faq-item').length).toBeGreaterThanOrEqual(5);
    expect(el.textContent).toContain('How do I place an order?');
    expect(el.textContent).toContain('munchrise@hotmail.com');
    expect(el.textContent).toContain('0991 036 9667');
  });

  it('opens the mail and phone apps from the contact rows', () => {
    const fixture = TestBed.createComponent(HelpPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('ion-item[href="mailto:munchrise@hotmail.com"]')).not.toBeNull();
    expect(el.querySelector('ion-item[href="tel:+639910369667"]')).not.toBeNull();
  });

  it('expands an FAQ answer when its question is tapped', () => {
    const fixture = TestBed.createComponent(HelpPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    // First FAQ starts open.
    expect(el.textContent).toContain('Browse the menu');

    fixture.componentInstance.toggle(1);
    fixture.detectChanges();

    expect(el.textContent).toContain('After your order containing that item is delivered');
    expect(el.textContent).not.toContain('Browse the menu');
  });
});
