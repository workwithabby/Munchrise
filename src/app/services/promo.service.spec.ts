import { TestBed } from '@angular/core/testing';

import { describePromo, PromoService } from './promo.service';

describe('PromoService (local mode)', () => {
  let promos: PromoService;

  beforeEach(() => {
    promos = TestBed.inject(PromoService);
  });

  it('starts with the two starter codes', () => {
    expect(promos.active().map((p) => p.code)).toEqual(['RISE10', 'MUNCH50']);
  });

  it('finds a code in any letter case', () => {
    expect(promos.find(' rise10 ')?.value).toBe(10);
    expect(promos.find('NOPE')).toBeUndefined();
  });

  it('lets the admin create a code, which then shows up for customers', async () => {
    const error = await promos.create({ code: 'sunrise20', type: 'percent', value: 20, minSubtotal: 200 });

    expect(error).toBeNull();
    const created = promos.find('SUNRISE20');
    expect(created?.description).toBe('20% off (min. ₱200)');
    expect(promos.active().length).toBe(3);
  });

  it('refuses bad codes with a clear message', async () => {
    expect(await promos.create({ code: 'ab', type: 'percent', value: 10 })).toContain('3 to 20');
    expect(await promos.create({ code: 'RISE10', type: 'percent', value: 10 })).toContain('already exists');
    expect(await promos.create({ code: 'BIGONE', type: 'percent', value: 150 })).toContain('100');
    expect(await promos.create({ code: 'FREEBIE', type: 'fixed', value: 0 })).toContain('discount');
  });

  it('switching a code off hides it from customers; deleting removes it', async () => {
    await promos.setActive('RISE10', false);
    expect(promos.find('RISE10')).toBeUndefined();
    expect(promos.all().some((p) => p.code === 'RISE10')).toBe(true); // the admin still sees it

    await promos.remove('RISE10');
    expect(promos.all().some((p) => p.code === 'RISE10')).toBe(false);
  });

  it('describes a code the way customers see it', () => {
    expect(describePromo({ type: 'fixed', value: 50, minSubtotal: 300 })).toBe('₱50 off (min. ₱300)');
    expect(describePromo({ type: 'percent', value: 10 })).toBe('10% off your order');
  });
});
