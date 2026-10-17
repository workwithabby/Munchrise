import { TestBed } from '@angular/core/testing';

import { RewardsService } from './rewards.service';

describe('RewardsService', () => {
  let rewards: RewardsService;

  beforeEach(() => {
    localStorage.removeItem('munchrise.points');
    localStorage.removeItem('munchrise.points-history');
    localStorage.removeItem('munchrise.vouchers');
    rewards = TestBed.inject(RewardsService);
  });

  it('gives 1 point for every 10 pesos spent', () => {
    expect(rewards.pointsFor(336)).toBe(33);
    expect(rewards.pointsFor(9.99)).toBe(0);
    expect(rewards.pointsFor(0)).toBe(0);
  });

  it('earns points and records them in history', () => {
    rewards.addEarn(33, 'Order MR-TEST01');

    expect(rewards.points()).toBe(33);
    expect(rewards.history().length).toBe(1);
    expect(rewards.history()[0].type).toBe('earn');
  });

  it('refuses to redeem when points are short', async () => {
    rewards.addEarn(50, 'Order MR-TEST02');

    const result = await rewards.redeem({ points: 100, discount: 50 });

    expect(result.ok).toBe(false);
    expect(rewards.points()).toBe(50);
    expect(rewards.voucherTotal()).toBe(0);
  });

  it('redeems a voucher: spends points and unlocks checkout credit', async () => {
    rewards.addEarn(120, 'Order MR-TEST03');

    const result = await rewards.redeem({ points: 100, discount: 50 });

    expect(result.ok).toBe(true);
    expect(rewards.points()).toBe(20);
    expect(rewards.voucherTotal()).toBe(50);
    expect(rewards.history()[0].type).toBe('redeem');
  });

  it('spends the voucher when an order uses it', () => {
    rewards.addEarn(100, 'Order MR-TEST04');
    rewards.redeem({ points: 100, discount: 50 });
    expect(rewards.voucherTotal()).toBe(50);

    rewards.spendVoucher(50);

    expect(rewards.voucherTotal()).toBe(0);
    expect(rewards.points()).toBe(0);
  });

  it('tracks progress toward the next tier', () => {
    rewards.addEarn(100, 'Order MR-TEST05');

    // 100 of the 180 points needed for the next tier
    expect(rewards.nextTier()?.points).toBe(180);
    expect(rewards.progress()).toBe(56);
    expect(rewards.voucherTotal()).toBe(0);
  });
});
