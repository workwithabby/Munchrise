export interface RewardTransaction {
  id: string;
  type: 'earn' | 'redeem';
  points: number;
  label: string;
  /** ISO date string */
  createdAt: string;
}

/** A discount you can buy with points. */
export interface RewardTier {
  points: number;
  discount: number;
}
