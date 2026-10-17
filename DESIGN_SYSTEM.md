# Munchrise Design System

Built with the **ui-ux-pro-max** skill (style + palette + typography search), adjusted to
keep the Munchrise brand colors. This is the single source of truth for how the app looks.
Logic, routes and services are never touched because of this file.

**Style direction:** Warm & appetizing food commerce — cream surfaces, white cards, one loud
CTA color, fresh teal accents, soft layered shadows, fast gentle motion. Friendly but grown-up.
**2026 refresh:** Calistoga + Inter type, frosted bottom tab bar, and offline category-gradient
product covers (no network images).

---

## 0. Navigation

- **Bottom tab bar** (primary): Home · Menu · Cart (live count badge) · Orders · Profile.
  Frosted translucent surface (`backdrop-filter: blur`), active tab = orange icon + label.
  Lives in `pages/tabs`; the five routes share it, everything else is full-screen.
- **Side menu** (secondary): Favorites, Rewards, Notifications, Dashboard, About, Developers,
  Help — plus the admin/vendor section. Reached from the hamburger on tab pages.
- Sticky action footers (Cart, Checkout, Product details) sit **above** the tab bar; tab pages
  add `.page--tabs` bottom padding so content never hides behind it.

---

## 1. Colors

### Brand / core tokens

| Token | Hex | Where it is used |
|---|---|---|
| `--munch-orange` | `#C8481A` | **Primary CTA**, prices, links, active states, brand accents |
| `--munch-teal` | `#2B8089` | Secondary buttons, "fresh/healthy" accents, info chips |
| `--munch-mustard` | `#DCA93E` | Highlights, badges, rating stars, "best seller", chips |
| `--munch-cream` | `#FFF4DC` | **Page background**, soft section fills |
| `--munch-brown` | `#4A2C17` | **Primary text**, headings, icons on light backgrounds |
| `--munch-white` | `#FFFFFF` | Card surfaces, sheets, inputs |

### Semantic tokens

| Token | Hex | Used for |
|---|---|---|
| `--color-success` | `#1E7A46` | "Delivered", success toasts, in-stock |
| `--color-success-bg` | `#E4F4EA` | Success chip background |
| `--color-danger` | `#C81E1E` | Errors, out-of-stock, destructive actions |
| `--color-danger-bg` | `#FDE7E7` | Error chip background, invalid field tint |
| `--color-warning` | `#B45309` | Low stock, "almost gone" |
| `--color-muted-text` | `#7A5C43` | Secondary/meta text (dates, hints) — still 6.1:1 on white |
| `--color-disabled-bg` | `#EFE3D3` | Disabled button background |
| `--color-disabled-text` | `#8F7A67` | Disabled button label |
| `--color-border` | `#EFE2CD` | Input borders, dividers on cream |

### Contrast rules (measured, WCAG AA = 4.5:1)

| Pair | Ratio | Rule |
|---|---|---|
| Brown on cream | **11.6** | ✅ default body text |
| Brown on white | **12.6** | ✅ card text |
| White on orange | **4.78** | ✅ primary button label |
| Orange on white | **4.78** | ✅ price/link text on white cards |
| White on teal | **4.61** | ✅ secondary button label |
| Teal on white | **4.61** | ✅ teal text on cards |
| Brown on mustard | **5.88** | ✅ mustard chips use **brown** text |
| White on mustard | **2.15** | ❌ **never** white text on mustard |
| Orange on cream | **4.37** | ⚠️ avoid orange text directly on cream — put it on a white card |
| Success green on white | **5.35** | ✅ (was 3.4 with the old green — darkened) |

---

## 2. Typography

**Pairing (2026 refresh — the "real food brand" direction, now shipped):**

- **Headings / display:** `Calistoga` — a warm rounded serif. Feels like a bakery menu, not
  a school deck. Single weight (400); hierarchy comes from size, never faux-bold.
- **Body / UI:** `Inter` — clean, neutral, very readable at 390px. Buttons, prices, forms.

```html
<link href="https://fonts.googleapis.com/css2?family=Calistoga&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

| Role | Font | Size | Weight | Line height |
|---|---|---|---|---|
| Display (hero) | Calistoga | 40px | 400 | 1.15 |
| Page title (H1) | Calistoga | 26px | 400 | 1.18 |
| Section title (H2) | Calistoga | 18px | 400 | 1.2 |
| Card title | Inter | 15px | 600 | 1.3 |
| Body | Inter | 15px | 400 | 1.55 |
| Meta / caption | Inter | 14px | 500 | 1.4 |
| Smallest text | Inter | 12px | 500 | 1.4 (**never smaller**) |
| Button label | Inter | 15px | 600 | 1 |
| Price (large) | Inter | 22px | 700 | 1 |
| Eyebrow / badge | Inter | 12px | 600 | 1, uppercase, 0.08em letter-spacing |

*The earlier Baloo 2 + Nunito pairing (playful/toy-like) was retired in the 2026 refresh.*

Rules: left-aligned text, sentence case for headings, no all-caps sentences, prices always
tabular/heavy so they scan. Calistoga never goes above weight 400 — use size for emphasis.

---

## 3. Spacing (4/8 rhythm)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48`

- Page gutters: **16px** (12px on very small phones)
- Card padding: **16px**
- Between cards in a stack: **12–16px**
- Section heading → content: **12px**
- Related elements: **8px**; unrelated blocks: **24–32px**
- Bottom of scroll content: **32px + safe area**

---

## 4. Radius

| Token | Value | Used on |
|---|---|---|
| `--radius-sm` | 10px | inputs, small tags |
| `--radius-md` | 12px | buttons, chips inside cards |
| `--radius-lg` | 18px | **cards, panels** |
| `--radius-xl` | 24px | hero blocks, bottom sheets, modals |
| `--radius-pill` | 999px | pills, avatars, badges |

---

## 5. Shadows

Warm-tinted (brown) shadows — never pure black. Layered two-stop depth for a softer 2026 feel.

| Token | Value | Used on |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(74,44,23,.05), 0 2px 8px rgba(74,44,23,.04)` | chips, small elements |
| `--shadow-md` | `0 4px 12px rgba(74,44,23,.07), 0 8px 24px rgba(74,44,23,.06)` | **cards** |
| `--shadow-lg` | `0 8px 20px rgba(74,44,23,.10), 0 16px 40px rgba(74,44,23,.10)` | sheets, modals, floating CTA |
| `--shadow-press` | `0 2px 6px rgba(74,44,23,.10)` | pressed card/button |

---

## 6. Buttons

Minimum height **48px** (tap target ≥ 44px everywhere), radius 12px, Inter 600/16px.
Width: full-width in forms and checkout, inline elsewhere.

| Variant | Background | Label | Notes |
|---|---|---|---|
| **Primary** | `#C8481A` | white | The one main action per screen |
| **Secondary** | `#2B8089` | white | Supporting action |
| **Highlight** | `#DCA93E` | **brown** | Rewards / "best seller" style actions |
| **Outline** | white | `#C8481A`, 1.5px `#C8481A` border | Lower-priority action |
| **Ghost** | transparent | brown | Tertiary, e.g. "Skip" |
| **Disabled** | `#EFE3D3` | `#8F7A67` | No shadow, no pointer |

States (CSS variables only):
- **Pressed:** `transform: scale(.98)` + `--shadow-press`, 150ms
- **Hover:** slightly darker fill, 180ms (web only)
- **Focus:** `outline: 2px solid #2B8089; outline-offset: 2px`
- Icon-only buttons: **44×44px** minimum with `aria-label`
- Never two primary buttons side by side on one screen

---

## 7. Cards

- Surface: **white** on the cream page background
- Radius **16px**, padding **16px**, shadow `--shadow-md`, no border needed
- Product card: image on top (4:3, cream placeholder), then name (16/600), rating row
  (13px + mustard star), footer with price (orange 700) and a 40px round add button
- Pressed: scale `.98` + `--shadow-press`
- Cards never sit flush against each other — 12px gap minimum

---

## 8. Icons (no emojis as UI)

- **Ionicons SVG only** (`<ion-icon name="...">`), one family, outline style at UI level,
  filled only for active/favorite states
- Sizes: 18px (inline), 20px (in buttons), 24px (default), 28–32px (empty states, big nav)
- Color comes from tokens: brown for neutral, orange for action, teal for info, mustard for
  highlights, `currentColor` where possible
- Decorative icons get `aria-hidden="true"`; icon-only buttons get `aria-label`
- Emojis are allowed **only** as product picture placeholders (the 🥐/☕ fallback art)

---

## 9. Motion

Small, fast, purposeful — 120–280ms. One canonical set (the old `--motion-*` aliases
point at these).

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 120ms | press feedback, chips, toggles |
| `--dur-base` | 180ms | fades, list appear, small expands, card hover |
| `--dur-slow` | 280ms | sheets/modals in, skeleton-to-content |
| `--ease` | `cubic-bezier(.22,1,.36,1)` | everything |
| Skeleton shimmer | 1.2s linear loop | loading cards |

- Enter: opacity 0→1 + translateY 8px max
- Press: scale .98 or opacity .85 — **never** move layout bounds
- No parallax, no big bounces, no long staggers
- `@media (prefers-reduced-motion: reduce)` → kill transforms, keep opacity

---

## 10. States (every list screen has all three)

1. **Loading — skeleton:** cream blocks with a soft shimmer that mirror the real layout
   (same card shape, same height → zero layout shift). Wrap with `aria-busy="true"`.
   Never show a skeleton for work faster than ~300ms.
2. **Empty — icon + sentence + action:** circle with a 32px Ionicon, one short line
   ("Your cart is empty"), one helper line, one primary button. No blank screens.
3. **Error — message + recovery:** red inline text with an icon and `role="alert"`,
   next to the field or block that failed, plus a "Try again" action where it makes sense.
   Never color-only signaling.

---

## 11. Safe areas & layout

- Respect `env(safe-area-inset-top)` in headers and `env(safe-area-inset-bottom)` for
  sticky footers/CTA bars (Ionic's `ion-content` + `ion-toolbar` already help — keep them)
- Sticky bottom CTA bars get `padding-bottom: calc(12px + env(safe-area-inset-bottom))`
- Content must never hide behind fixed bars: add matching scroll padding
- Mobile-first at **390px**; grid breakpoints at 600px / 900px; gutters grow to 24px on tablets
- No horizontal scrolling, no fixed pixel widths wider than the viewport

---

## 12. Accessibility (non-negotiable)

- Body text ≥ 4.5:1 (table in §1), large text/icons ≥ 3:1
- Tap targets ≥ 44×44px, 8px apart
- Visible focus ring, logical tab order, labels above inputs (never placeholder-only)
- Field errors: inline, below the field, `role="alert"`
- Color is never the only signal (pair with text/icon)
- Works with reduced motion and larger system text

---

## 13. Quick token block (copy into `variables.scss`)

```css
:root {
  /* color */
  --munch-orange: #C8481A;
  --munch-teal: #2B8089;
  --munch-mustard: #DCA93E;
  --munch-cream: #FFF4DC;
  --munch-brown: #4A2C17;
  --color-success: #1E7A46;
  --color-danger: #C81E1E;
  --color-muted-text: #7A5C43;
  --color-border: #EFE2CD;
  --color-border-strong: #E3D2B8;
  --color-teal-ink: #1F646B;
  --color-amber-ink: #92400E;

  /* radius */
  --radius-sm: 10px; --radius-md: 12px; --radius-lg: 18px;
  --radius-xl: 24px; --radius-pill: 999px;

  /* shadow (layered, warm-tinted) */
  --shadow-sm: 0 1px 2px rgba(74,44,23,.05), 0 2px 8px rgba(74,44,23,.04);
  --shadow-md: 0 4px 12px rgba(74,44,23,.07), 0 8px 24px rgba(74,44,23,.06);
  --shadow-lg: 0 8px 20px rgba(74,44,23,.10), 0 16px 40px rgba(74,44,23,.10);
  --shadow-press: 0 2px 6px rgba(74,44,23,.10);

  /* motion */
  --dur-fast: 120ms; --dur-base: 180ms; --dur-slow: 280ms;
  --ease: cubic-bezier(.22,1,.36,1);

  /* layout */
  --tab-bar-height: 58px;
}
```
