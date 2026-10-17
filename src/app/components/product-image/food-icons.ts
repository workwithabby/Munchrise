/**
 * Category cover art for product images.
 *
 * Every product category gets a duotone brand-palette gradient and a simple
 * line-art food icon, so the app looks intentional and works fully offline —
 * no network images required. When real photos are added later they simply
 * replace the cover (the product-image component prefers a real `src`).
 */

export interface CategoryCover {
  /** Two-stop linear gradient (CSS background value). */
  gradient: string;
  /** Inner markup for a 48x48 line-art SVG (stroke: currentColor). */
  icon: string;
}

const SANDWICH_ICON = `
  <path d="M10 20c0-8 6-13 14-13s14 5 14 13" />
  <path d="M10 22h28" />
  <path d="M10 26h28" />
  <path d="M10 28h28c0 5-3 8-9 8H19c-6 0-9-3-9-8" />`;

const PANCAKE_ICON = `
  <ellipse cx="24" cy="33" rx="15" ry="5" />
  <ellipse cx="24" cy="26" rx="15" ry="5" />
  <ellipse cx="24" cy="19" rx="15" ry="5" />
  <rect x="20" y="10" width="8" height="6" rx="1.5" />`;

const RICE_ICON = `
  <path d="M8 26h32c0 9-7 15-16 15S8 35 8 26z" />
  <path d="M14 26c0-7 4-11 10-11s10 4 10 11" />
  <path d="M20 9c-1 2 1 3 0 5" />
  <path d="M28 9c-1 2 1 3 0 5" />`;

const WRAP_ICON = `
  <rect x="12" y="17" width="28" height="14" rx="7" />
  <ellipse cx="14" cy="24" rx="4" ry="7" />
  <path d="M20 17v14" />
  <path d="M30 17v14" />`;

const SIDE_ICON = `
  <path d="M13 22h22l-2.5 18h-17z" />
  <path d="M17 22V12" />
  <path d="M24 22V9" />
  <path d="M31 22v-10" />`;

const CEREAL_ICON = `
  <path d="M8 25h32c0 9-7 16-16 16S8 34 8 25z" />
  <circle cx="18" cy="21" r="2.5" />
  <circle cx="26" cy="19" r="2.5" />
  <circle cx="32" cy="22" r="2" />
  <path d="M36 10l4 8" />
  <circle cx="40" cy="9" r="2.5" />`;

const COMBO_ICON = `
  <rect x="8" y="12" width="32" height="26" rx="3" />
  <path d="M24 12v14" />
  <path d="M8 26h32" />
  <path d="M14 19h4" />
  <path d="M30 32h4" />`;

const DRINK_ICON = `
  <path d="M14 16h20l-2 24H16z" />
  <rect x="11" y="11" width="26" height="6" rx="2" />
  <path d="M30 4l-6 12" />`;

/**
 * Category name -> cover. Keys must match `Product.category` exactly.
 * Unknown categories fall back to a neutral sunrise gradient + cup icon.
 */
export const CATEGORY_COVERS: Record<string, CategoryCover> = {
  'Sandwiches & Muffins': {
    gradient: 'linear-gradient(145deg, #e8a33d 0%, #c8481a 100%)',
    icon: SANDWICH_ICON,
  },
  'Pancakes & Waffles': {
    gradient: 'linear-gradient(145deg, #f0c24b 0%, #dca93e 100%)',
    icon: PANCAKE_ICON,
  },
  'Rice Bowls': {
    gradient: 'linear-gradient(145deg, #3fa0a9 0%, #2b8089 100%)',
    icon: RICE_ICON,
  },
  'Wraps & Burritos': {
    gradient: 'linear-gradient(145deg, #d96a3f 0%, #a93a12 100%)',
    icon: WRAP_ICON,
  },
  Sides: {
    gradient: 'linear-gradient(145deg, #c99b62 0%, #8a5a2b 100%)',
    icon: SIDE_ICON,
  },
  'Healthy & Cereal': {
    gradient: 'linear-gradient(145deg, #7fb069 0%, #4a7c3f 100%)',
    icon: CEREAL_ICON,
  },
  'Combo Meals': {
    gradient: 'linear-gradient(145deg, #e8843d 0%, #c8481a 100%)',
    icon: COMBO_ICON,
  },
  Drinks: {
    gradient: 'linear-gradient(145deg, #5fb8c4 0%, #2b8089 100%)',
    icon: DRINK_ICON,
  },
};

const FALLBACK_COVER: CategoryCover = {
  gradient: 'linear-gradient(145deg, #e8843d 0%, #c8481a 100%)',
  icon: DRINK_ICON,
};

/** Look up a category cover; always returns something renderable. */
export function categoryCover(category: string): CategoryCover {
  return CATEGORY_COVERS[category] ?? FALLBACK_COVER;
}

/** True when the src is empty or a placehold.co banner (render the cover instead). */
export function shouldUseCover(src: string): boolean {
  return !src || src.includes('placehold.co');
}
