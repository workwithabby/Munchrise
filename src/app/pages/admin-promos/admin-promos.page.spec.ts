import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';

import { AdminPromosPage } from './admin-promos.page';
import { PromoService } from '../../services/promo.service';

describe('AdminPromosPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPromosPage],
      providers: [
        provideRouter([]),
        { provide: ToastController, useValue: { create: async () => ({ present: async () => {} }) } },
        { provide: AlertController, useValue: { create: async () => ({ present: async () => {} }) } },
      ],
    }).compileComponents();
  });

  it('lists the codes and creates a new one from the form', async () => {
    const fixture = TestBed.createComponent(AdminPromosPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.promo').length).toBe(2);

    const page = fixture.componentInstance;
    page.code.set('SUNRISE20');
    page.type.set('percent');
    page.value.set('20');
    await page.create();
    fixture.detectChanges();

    expect(TestBed.inject(PromoService).find('SUNRISE20')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.promo').length).toBe(3);
    expect(page.code()).toBe(''); // the form is cleared
  });

  it('shows the problem when the form is wrong', async () => {
    const fixture = TestBed.createComponent(AdminPromosPage);
    const page = fixture.componentInstance;
    page.code.set('X');
    page.value.set('10');
    await page.create();
    fixture.detectChanges();

    expect(page.error()).toContain('3 to 20');
    expect(fixture.nativeElement.querySelector('.form-error')).toBeTruthy();
  });
});
