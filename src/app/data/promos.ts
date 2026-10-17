/** Mock checkout rules (Section 7 of the build prompt). */

export const DELIVERY_FEE = 49;
/** Delivery is free when the subtotal reaches this amount. */
export const FREE_DELIVERY_MIN = 500;

export type PromoType = 'percent' | 'fixed';

export interface PromoCode {
  code: string;
  type: PromoType;
  /** percent (10 = 10%) or peso amount (50 = ₱50) */
  value: number;
  /** Minimum subtotal required, if any. */
  minSubtotal?: number;
  description: string;
  /** Admins can switch a code off without deleting it. */
  active?: boolean;
}

export const PROMO_CODES: PromoCode[] = [
  {
    code: 'RISE10',
    type: 'percent',
    value: 10,
    description: '10% off your order',
  },
  {
    code: 'MUNCH50',
    type: 'fixed',
    value: 50,
    minSubtotal: 300,
    description: '₱50 off (min. ₱300)',
  },
];
