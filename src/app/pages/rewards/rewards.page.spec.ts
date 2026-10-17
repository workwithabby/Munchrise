import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RewardsPage } from './rewards.page';
import { RewardsService } from '../../services/rewards.service';

describe('RewardsPage', () => {
  beforeEach(async () => {
    localStorage.removeItem('munchrise.points');
    localStorage.removeItem('munchrise.points-history');
    localStorage.removeItem('munchrise.vouchers');
    await TestBed.configureTestingModule({
      imports: [RewardsPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows the balance and redeem tiers', () => {
    const fixture = TestBed.createComponent(RewardsPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Your points');
    expect(fixture.nativeElement.textContent).toContain('Redeem a discount');
  });

  it('redeems a tier when you have enough points', async () => {
    TestBed.inject(RewardsService).addEarn(150, 'Order MR-REWARD');

    const fixture = TestBed.createComponent(RewardsPage);
    fixture.detectChanges();

    await fixture.componentInstance.redeem({ points: 100, discount: 50 });
    fixture.detectChanges();

    expect(TestBed.inject(RewardsService).voucherTotal()).toBe(50);
    expect(fixture.nativeElement.textContent).toContain('Voucher ready');
  });
});
