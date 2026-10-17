/** What is saved in the cart. The product details are looked up from ProductService. */
export interface CartItem {
  productId: number;
  quantity: number;
}

/** A cart item joined with its product — handy for templates. */
export interface DetailedCartItem {
  product: import('./product.model').Product;
  quantity: number;
}
