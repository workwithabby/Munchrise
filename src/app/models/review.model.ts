export interface Review {
  id: string;
  productId: number;
  /** Who wrote it (the backend's user id). Missing on starter reviews. */
  userId?: string;
  author: string;
  /** 1 - 5 stars */
  rating: number;
  comment: string;
  /** ISO date string */
  createdAt: string;
}
