# Parent dashboard design tokens

## Reference table

| Category | Token / element | Value |
|---|---|---|
| Colour | Primary / Royal Indigo | `#1E2B7B` |
| Colour | Primary pressed | `#151E57` |
| Colour | Secondary / Emerald | `#008751` |
| Colour | Tertiary / Sun Amber | `#E5A000` |
| Colour | Alert / Coral | `#E05638` |
| Colour | Page background | `#F8FAFC` |
| Colour | Card | `#FFFFFF` |
| Colour | Border | `#E2E8F0` |
| Colour | Body text | `#1A1D20` |
| Colour | Placeholder | `#94A3B8` |
| Colour | Pastel status fills: green / amber / coral | `#F0FDF4` / `#FEF9C3` / `#FFF1EE` |
| Colour | Status: paid background / text | `#DCFCE7` / `#008751` |
| Colour | Status: pending background / text | `#FEF9C3` / `#A16207` |
| Colour | Status: overdue background / text | `#FEE2E2` / `#B91C1C` |
| Colour | Ghost button border / hover | `#CBD5E1` / `#F1F5F9` |
| Font | Family | Plus Jakarta Sans |
| Font | Available weights | 400, 500, 600, 700, 800 |
| Type size | Display, desktop / mobile | 36px / 44px; 28px / 36px |
| Type size | Headline large, desktop / mobile | 28px / 36px; 22px / 30px |
| Type size | Headline medium | 20px / 28px |
| Type size | Headline small | 16px / 24px |
| Type size | Body large | 16px / 26px |
| Type size | Body medium | 14px / 22px |
| Type size | Body small | 12px / 18px |
| Type size | Label | 12–14px |
| Type size | Metric | 32px / 38px |
| Spacing | Scale | 4px, 8px, 16px, 24px, 40px |
| Spacing | Default item gap | 16px |
| Radius | Buttons, inputs, notice banners | 8px |
| Radius | Cards, invoice blocks, modals | 16px |
| Radius | Status chips, avatars, counters | Fully rounded / pill |
| Button | Primary | `#1E2B7B` background, white text, 600 weight, 8px radius; pressed `#151E57` |
| Button | Action green | `#008751` background, white text; reserved for Pay School Fees, Download Report Card, Approve Result |
| Button | Ghost | 1px `#CBD5E1` border, `#1E2B7B` text, `#F1F5F9` hover |
| Button | Mobile minimum height | 48px |
| Button | Focus ring | 3px `#E5A000` outline |
| Input | Base | 44px height, 1px `#CBD5E1` border, 8px radius, white background |
| Input | Focus | `#1E2B7B` border with 2px `#E2E8F0` ring |
| Badge | Status chip | Pill; 4px vertical and 10px horizontal padding; text label accompanies colour |
| Badge | Grade | Small, high-contrast badge |

## Tailwind theme

```css
@theme {
  --color-primary: #1E2B7B;
  --color-primary-pressed: #151E57;
  --color-secondary: #008751;
  --color-tertiary: #E5A000;
  --color-alert: #E05638;
  --color-page: #F8FAFC;
  --color-card: #FFFFFF;
  --color-border: #E2E8F0;
  --color-text: #1A1D20;
  --color-placeholder: #94A3B8;
  --color-status-green: #F0FDF4;
  --color-status-amber: #FEF9C3;
  --color-status-coral: #FFF1EE;
  --color-badge-paid-bg: #DCFCE7;
  --color-badge-paid-text: #008751;
  --color-badge-pending-bg: #FEF9C3;
  --color-badge-pending-text: #A16207;
  --color-badge-overdue-bg: #FEE2E2;
  --color-badge-overdue-text: #B91C1C;
  --color-button-ghost-border: #CBD5E1;
  --color-button-ghost-hover: #F1F5F9;

  --font-sans: "Plus Jakarta Sans", sans-serif;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;

  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-4: 16px;
  --spacing-6: 24px;
  --spacing-10: 40px;

  --radius-control: 8px;
  --radius-card: 16px;
  --radius-pill: 9999px;
}
```
