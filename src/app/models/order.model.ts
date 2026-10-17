/** Order status flow: Placed -> Preparing -> Out for Delivery -> Delivered */
export type OrderStatus = 'Placed' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';

/** The steps an order goes through, in order (a cancelled order leaves the flow). */
export const ORDER_FLOW: OrderStatus[] = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];

/** When an order reached a status (shown on the tracking timeline). */
export interface StatusChange {
  status: OrderStatus;
  /** ISO date string */
  at: string;
}

export type PaymentMethod = 'GCash' | 'Credit/Debit Card' | 'Cash on Delivery';

/** One product line inside an order (price is frozen at checkout time). */
export interface OrderLine {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

export interface ShippingInfo {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  notes?: string;
}

export interface Order {
  /** Short receipt number like "MR-1A2B3C" */
  id: string;
  /** ISO date string */
  placedAt: string;
  items: OrderLine[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  promoCode?: string;
  payment: PaymentMethod;
  shipping: ShippingInfo;
  status: OrderStatus;
  /** Every status change with its time. Older orders may not have it. */
  history?: StatusChange[];
  /** Rider who took the order (set when it goes out for delivery). */
  riderName?: string;
  riderId?: string;
  pointsEarned: number;
  /** Reference number of the (simulated) GCash / card payment. Cash on Delivery has none. */
  paymentRef?: string;
  /** Why the order was cancelled, and by whom ('user' or 'admin'). */
  cancelReason?: string;
  cancelledBy?: 'user' | 'admin';
  /** ISO date the payment went through. */
  paidAt?: string;
}
