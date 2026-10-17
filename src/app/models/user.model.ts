export interface SavedAddress {
  id: string;
  label: string;
  line: string;
  city: string;
}

/** Only ever a fake/masked value is stored — never a real card number. */
export interface SavedPayment {
  id: string;
  label: string;
  type: 'GCash' | 'Card';
  masked: string;
}

/**
 * Who is using the app right now:
 * - 'guest': can only look around, cannot order
 * - 'user':  normal account (can order)
 * - 'admin': normal account + the Admin / Vendor page
 * - 'rider': delivers orders and marks them picked up / delivered
 */
export type UserRole = 'guest' | 'user' | 'admin' | 'rider';

export interface User {
  id: string;
  /** Full name (first name + surname), shown across the app. */
  name: string;
  /** Saved separately from the profile page; older accounts only have `name`. */
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  /** Relative path or data URL for the avatar. */
  avatar?: string;
  role: UserRole;
  addresses: SavedAddress[];
  payments: SavedPayment[];
}
