import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';

import { PROMO_CODES, PromoCode } from '../data/promos';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export interface PromoInput {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSubtotal?: number;
  description?: string;
}

/** Same shape the shop prints on its deal cards. */
export function describePromo(p: Pick<PromoCode, 'type' | 'value' | 'minSubtotal'>): string {
  if (p.type === 'percent') {
    return p.minSubtotal ? `${p.value}% off (min. ₱${p.minSubtotal})` : `${p.value}% off your order`;
  }
  return p.minSubtotal ? `₱${p.value} off (min. ₱${p.minSubtotal})` : `₱${p.value} off your order`;
}

function fromRow(row: Record<string, unknown>): PromoCode {
  return {
    code: row['code'] as string,
    type: row['type'] as 'percent' | 'fixed',
    value: Number(row['value']),
    minSubtotal: row['min_subtotal'] === null || row['min_subtotal'] === undefined ? undefined : Number(row['min_subtotal']),
    description: (row['description'] as string) ?? '',
    active: row['active'] as boolean,
  };
}

/**
 * Promo codes.
 * Backend mode: the `promo_codes` table. Admins create, switch off and delete codes in the
 * app; customers see the active ones on Home and can use them at checkout, and changes show
 * up live. (The server re-checks the code when the order is placed.)
 * Local mode (unit tests): the two starter codes.
 */
@Injectable({ providedIn: 'root' })
export class PromoService {
  private readonly backend = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  /** Every code this person may see: customers get the active ones, the admin gets all. */
  readonly all = signal<PromoCode[]>(PROMO_CODES.map((p) => ({ ...p, active: true })));

  /** Codes customers can use right now. */
  readonly active = computed(() => this.all().filter((p) => p.active !== false));

  constructor() {
    if (!this.backend.enabled) return;

    // load now, and again after sign-in (an admin also gets the switched-off codes)
    effect(() => {
      this.auth.user();
      untracked(() => void this.refresh());
    });
    this.backend.client
      .channel('promo-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_codes' }, () => void this.refresh())
      .subscribe();
  }

  /** Re-reads the codes (also called after sign-in so an admin sees the inactive ones too). */
  async refresh(): Promise<void> {
    if (!this.backend.enabled) return;
    const { data, error } = await this.backend.client.from('promo_codes').select('*').order('code');
    if (error || !data) return;
    this.all.set(data.map(fromRow));
  }

  find(code: string): PromoCode | undefined {
    const clean = code.trim().toUpperCase();
    return this.active().find((p) => p.code === clean);
  }

  /** Checks an admin's form and explains what is wrong, or returns null when it is fine. */
  validate(input: PromoInput): string | null {
    const code = input.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(code)) return 'Code must be 3 to 20 letters or numbers (no spaces).';
    if (this.all().some((p) => p.code === code)) return `${code} already exists.`;
    if (!Number.isFinite(input.value) || input.value <= 0) return 'Enter a discount amount.';
    if (input.type === 'percent' && input.value > 100) return 'A percent discount cannot be more than 100.';
    if (input.minSubtotal !== undefined && (!Number.isFinite(input.minSubtotal) || input.minSubtotal < 0)) {
      return 'The minimum order cannot be negative.';
    }
    return null;
  }

  /** Admin: add a code. Returns an error message, or null when saved. */
  async create(input: PromoInput): Promise<string | null> {
    const problem = this.validate(input);
    if (problem) return problem;

    const promo: PromoCode = {
      code: input.code.trim().toUpperCase(),
      type: input.type,
      value: input.value,
      minSubtotal: input.minSubtotal || undefined,
      description: input.description?.trim() || describePromo({ type: input.type, value: input.value, minSubtotal: input.minSubtotal || undefined }),
      active: true,
    };

    if (this.backend.enabled) {
      const { error } = await this.backend.client.from('promo_codes').insert({
        code: promo.code,
        type: promo.type,
        value: promo.value,
        min_subtotal: promo.minSubtotal ?? null,
        description: promo.description,
        active: true,
      });
      if (error) return error.message;
      await this.refresh();
      return null;
    }

    this.all.update((list) => [...list, promo]);
    return null;
  }

  /** Admin: switch a code on or off without deleting it. */
  async setActive(code: string, active: boolean): Promise<void> {
    this.all.update((list) => list.map((p) => (p.code === code ? { ...p, active } : p)));
    if (!this.backend.enabled) return;

    const { error } = await this.backend.client.from('promo_codes').update({ active }).eq('code', code);
    if (error) await this.refresh();
  }

  /** Admin: delete a code. */
  async remove(code: string): Promise<void> {
    this.all.update((list) => list.filter((p) => p.code !== code));
    if (!this.backend.enabled) return;

    const { error } = await this.backend.client.from('promo_codes').delete().eq('code', code);
    if (error) await this.refresh();
  }
}
