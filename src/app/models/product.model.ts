/** Nutrition info shown on the product details page (mock values). */
export interface Nutrition {
  calories: number;
  /** grams */
  protein: number;
  /** grams */
  carbs: number;
  /** grams */
  fat: number;
}

/** Labels we can filter products by. */
export type DietaryTag =
  | 'vegetarian'
  | 'vegan'
  | 'high-protein'
  | 'low-sugar'
  | 'low-fat'
  | 'low-cal'
  | 'low-carb'
  | 'high-fiber'
  | 'gluten-free';

/** One item in the menu. */
export interface Product {
  id: number;
  name: string;
  /** Short fun line shown under the name. */
  description: string;
  category: string;
  /** Price in Philippine Peso (plain number, format it with the peso pipe). */
  price: number;
  /** Where the picture lives — the ONE place to change it (URL or local file
   *  like "assets/products/morning-melt.jpg"). Components only read this. */
  image: string;
  nutrition: Nutrition;
  stock: number;
  /** Average star rating, 3.8 - 5.0 */
  rating: number;
  isBestSeller: boolean;
  dietary: DietaryTag[];
}
